<?php

namespace App\Services;

use App\Exceptions\BusinessException;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\ShopStock;
use App\Models\StoreStock;
use App\Support\Money;
use Illuminate\Support\Facades\DB;

class SaleService
{
    public function __construct(
        private readonly StockService $stock,
        private readonly CustomerLedgerService $ledger,
    ) {}

    /**
     * Create a sale atomically: validate shop stock, create sale + items, deduct shop stock,
     * write stock ledger rows and post udhari. Any failure rolls everything back.
     *
     * @param  array{items: array<int, array{product_id:int, quantity:int, unit_price?:numeric|null}>, payment_method:string, customer_id?:int|null, notes?:string|null}  $data
     * @param  string  $location  store | shop — where the sold stock is taken from
     * @param  string  $source  pos | closing
     */
    public function create(array $data, ?int $userId, string $location = 'shop', string $source = 'pos'): Sale
    {
        // Merge duplicate product lines (same product tapped twice).
        $lines = [];
        foreach ($data['items'] as $item) {
            $id = (int) $item['product_id'];
            $lines[$id] ??= ['quantity' => 0, 'unit_price' => $item['unit_price'] ?? null];
            $lines[$id]['quantity'] += (int) $item['quantity'];
        }
        ksort($lines);

        return DB::transaction(function () use ($lines, $data, $userId, $location, $source) {
            $ids = array_keys($lines);
            // Lock products (stable avg_cost) and location balances in id order.
            $products = Product::whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $balanceModel = $location === 'store' ? StoreStock::class : ShopStock::class;
            $balances = $balanceModel::whereIn('product_id', $ids)->orderBy('product_id')->lockForUpdate()->get()->keyBy('product_id');

            $items = [];
            $totalAmount = '0';
            $totalCost = '0';
            $totalQty = 0;

            foreach ($lines as $productId => $line) {
                $product = $products[$productId];
                $available = (int) ($balances[$productId]->quantity ?? 0);

                if (! $product->is_active) {
                    throw new BusinessException('PRODUCT_INACTIVE', ['product' => $product->name, 'product_id' => $productId]);
                }
                if ($line['quantity'] > $available) {
                    throw new BusinessException($location === 'store' ? 'INSUFFICIENT_STORE_STOCK' : 'INSUFFICIENT_STOCK', [
                        'product' => $product->name,
                        'available' => $available,
                        'product_id' => $productId,
                    ]);
                }

                $unitPrice = Money::round($line['unit_price'] ?? $product->selling_price, 2);
                $unitCost = Money::cmp($product->avg_cost, 0) > 0 ? $product->avg_cost : $product->cost_price;
                $lineTotal = Money::round(Money::mul($line['quantity'], $unitPrice), 2);
                $lineCost = Money::round(Money::mul($line['quantity'], $unitCost), 2);

                $items[] = [
                    'product_id' => $productId,
                    'product_name' => $product->name,
                    'quantity' => $line['quantity'],
                    'unit_price' => $unitPrice,
                    'unit_cost' => Money::round($unitCost, 4),
                    'line_total' => $lineTotal,
                    'line_cost' => $lineCost,
                    'line_profit' => Money::round(Money::sub($lineTotal, $lineCost), 2),
                ];
                $totalAmount = Money::add($totalAmount, $lineTotal);
                $totalCost = Money::add($totalCost, $lineCost);
                $totalQty += $line['quantity'];
            }

            $customer = null;
            if (! empty($data['customer_id'])) {
                $customer = Customer::whereKey($data['customer_id'])->lockForUpdate()->firstOrFail();
            }

            $sale = Sale::create([
                'customer_id' => $customer?->id,
                'payment_method' => $data['payment_method'],
                'total_qty' => $totalQty,
                'total_amount' => Money::round($totalAmount, 2),
                'total_cost' => Money::round($totalCost, 2),
                'profit' => Money::round(Money::sub($totalAmount, $totalCost), 2),
                'status' => 'completed',
                'sold_at' => now(),
                'notes' => $data['notes'] ?? null,
                'user_id' => $userId,
                'source' => $source,
                'stock_location' => $location,
            ]);
            $sale->invoice_no = sprintf('SG%06d', $sale->id);
            $sale->save();

            $sale->items()->createMany($items);

            foreach ($items as $item) {
                $this->stock->move($item['product_id'], $location, -$item['quantity'], 'sale', $item['unit_cost'], 'sale', $sale->id, $sale->invoice_no, $userId);
            }

            if ($data['payment_method'] === 'udhari') {
                $this->ledger->post($customer, 'sale', $sale->total_amount, '0', $sale->sold_at, $sale->id, null, $sale->invoice_no, $userId);
            }

            return $sale->load(['items', 'customer']);
        });
    }

    /**
     * Day-end closing: the owner counts what is left at a location; everything missing since the
     * last count is recorded as one sale (bill) at selling price. Remaining counts are compared with
     * the locked balance, so a POS sale made while counting is never double-counted.
     * Products whose count equals the balance are skipped. A wrong closing is undone by cancelling the bill.
     *
     * @param  array<int, array{product_id:int, remaining:int}>  $counts
     */
    public function closing(array $counts, string $location, string $paymentMethod, ?int $userId): Sale
    {
        $remaining = [];
        foreach ($counts as $count) {
            $remaining[(int) $count['product_id']] = (int) $count['remaining'];
        }
        ksort($remaining);

        return DB::transaction(function () use ($remaining, $location, $paymentMethod, $userId) {
            // Same lock order as create(): products first, then balances.
            $products = Product::whereIn('id', array_keys($remaining))->orderBy('id')->lockForUpdate()->get()->keyBy('id');

            $items = [];
            foreach ($remaining as $productId => $left) {
                $available = $this->stock->lockBalance($location, $productId)->quantity;
                if ($left > $available) {
                    throw new BusinessException('COUNT_MORE_THAN_STOCK', [
                        'product' => $products[$productId]->name,
                        'available' => $available,
                        'product_id' => $productId,
                    ]);
                }
                if ($left < $available) {
                    $items[] = ['product_id' => $productId, 'quantity' => $available - $left];
                }
            }

            if (! $items) {
                throw new BusinessException('NOTHING_SOLD');
            }

            return $this->create(['items' => $items, 'payment_method' => $paymentMethod], $userId, $location, 'closing');
        });
    }

    /**
     * Cancel a bill: return items to the location they were sold from, at their original cost, and reverse udhari.
     */
    public function void(int $saleId, ?string $reason, ?int $userId): Sale
    {
        return DB::transaction(function () use ($saleId, $reason, $userId) {
            $sale = Sale::whereKey($saleId)->lockForUpdate()->firstOrFail();
            if ($sale->status === 'void') {
                throw new BusinessException('ALREADY_VOIDED');
            }
            $sale->load('items');

            foreach ($sale->items->sortBy('product_id') as $item) {
                $product = Product::whereKey($item->product_id)->lockForUpdate()->first();
                $this->stock->receiveAtCost($product, $item->quantity, $item->unit_cost);
                $product->save();
                $this->stock->move($item->product_id, $sale->stock_location ?? 'shop', $item->quantity, 'sale_void', $item->unit_cost, 'sale', $sale->id, $sale->invoice_no, $userId);
            }

            if ($sale->payment_method === 'udhari' && $sale->customer_id) {
                $customer = Customer::whereKey($sale->customer_id)->lockForUpdate()->first();
                $this->ledger->post($customer, 'sale_void', '0', $sale->total_amount, now(), $sale->id, null, $sale->invoice_no, $userId);
            }

            $sale->status = 'void';
            $sale->voided_at = now();
            $sale->void_reason = $reason ? mb_substr($reason, 0, 255) : null;
            $sale->save();

            return $sale->load(['items', 'customer']);
        });
    }
}

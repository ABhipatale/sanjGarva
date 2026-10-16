<?php

namespace App\Services;

use App\Exceptions\BusinessException;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\ShopStock;
use App\Models\StockAdjustment;
use App\Models\StockTransaction;
use App\Models\StockTransfer;
use App\Models\StoreStock;
use App\Models\Supplier;
use App\Support\Money;
use Illuminate\Support\Facades\DB;

/**
 * All stock balance changes go through this service.
 *
 * Every change: locks the balance row, updates it, and appends a stock_transactions row,
 * so balances and the ledger can never disagree. Callers that need atomicity across several
 * operations (e.g. a sale) wrap calls in their own DB::transaction().
 *
 * Inventory valuation: weighted average cost, maintained on products.avg_cost over the
 * combined Store + Shop quantity. It changes only when stock comes in at a cost
 * (purchase, opening stock, cancelled sale). Sales record the avg cost at sale time.
 */
class StockService
{
    public function __construct(private readonly SupplierLedgerService $suppliers) {}

    /** Create zeroed balance rows and post opening stock for a new product. */
    public function initialize(Product $product, int $openingStore, int $openingShop, ?int $userId): void
    {
        StoreStock::firstOrCreate(['product_id' => $product->id], ['quantity' => 0]);
        ShopStock::firstOrCreate(['product_id' => $product->id], ['quantity' => 0]);

        foreach (['store' => $openingStore, 'shop' => $openingShop] as $location => $qty) {
            if ($qty > 0) {
                $this->move($product->id, $location, $qty, 'opening', $product->avg_cost, null, null, null, $userId);
            }
        }
    }

    /** One product received into the Store (a bill with a single line). */
    public function addPurchase(array $data, ?int $userId): Purchase
    {
        return $this->addPurchaseBill(array_merge($data, ['items' => [$data]]), $userId)[0];
    }

    /**
     * One supplier bill with several products, received into the Store in one transaction:
     * every line becomes a purchase (stock + weighted average cost). With a supplier, each line is
     * posted to the supplier's khata (unpaid goes up) and the amount paid now is posted once for the
     * whole bill. Any failure rolls back the entire bill.
     *
     * @param  array{items: array<int, array{product_id:int, quantity:int, cost_price:numeric, selling_price?:numeric|null}>, supplier_id?:int|null, paid_amount?:numeric|null, payment_method?:string|null, supplier?:string|null, invoice_no?:string|null, purchase_date?:string|null, notes?:string|null}  $data
     * @return list<Purchase>
     */
    public function addPurchaseBill(array $data, ?int $userId): array
    {
        return DB::transaction(function () use ($data, $userId) {
            // Lock products in a stable order to avoid deadlocks; lines keep the order they were entered in.
            $ids = array_unique(array_map(fn ($item) => (int) $item['product_id'], $data['items']));
            $products = Product::whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get()->keyBy('id');

            $lines = [];
            $billTotal = '0';
            foreach ($data['items'] as $item) {
                $qty = (int) $item['quantity'];
                $unitCost = Money::round($item['cost_price'], 2);
                $lineTotal = Money::round(Money::mul($qty, $unitCost), 2);
                $lines[] = [$products[(int) $item['product_id']], $item, $qty, $unitCost, $lineTotal];
                $billTotal = Money::add($billTotal, $lineTotal);
            }
            $billTotal = Money::round($billTotal, 2);

            $supplier = ! empty($data['supplier_id']) ? Supplier::whereKey($data['supplier_id'])->lockForUpdate()->firstOrFail() : null;
            // Stock bought without a supplier account is treated as paid in full.
            $paid = $supplier ? Money::round($data['paid_amount'] ?? 0, 2) : $billTotal;
            if (Money::cmp($paid, $billTotal) > 0) {
                throw new BusinessException('PAID_MORE_THAN_BILL', ['total' => $billTotal]);
            }

            $invoice = $data['invoice_no'] ?? null;
            $purchaseDate = $data['purchase_date'] ?? now()->toDateString();
            $ledgerDate = now()->setDateFrom(\Illuminate\Support\Carbon::parse($purchaseDate));
            // Paid amount is split over the lines in order, so each purchase row shows what was paid for it.
            $paidLeft = $paid;
            $purchases = [];

            foreach ($lines as [$product, $item, $qty, $unitCost, $lineTotal]) {
                $this->receiveAtCost($product, $qty, $unitCost);
                $product->cost_price = $unitCost;
                if (isset($item['selling_price']) && $item['selling_price'] !== '') {
                    $product->selling_price = Money::round($item['selling_price'], 2);
                }
                $product->save();

                $linePaid = Money::cmp($paidLeft, $lineTotal) > 0 ? $lineTotal : $paidLeft;
                $paidLeft = Money::round(Money::sub($paidLeft, $linePaid), 2);

                $purchase = Purchase::create([
                    'product_id' => $product->id,
                    'quantity' => $qty,
                    'unit_cost' => $unitCost,
                    'total_cost' => $lineTotal,
                    'selling_price' => $item['selling_price'] ?? null,
                    'supplier' => $supplier?->name ?? ($data['supplier'] ?? null),
                    'supplier_id' => $supplier?->id,
                    'paid_amount' => $linePaid,
                    'invoice_no' => $invoice,
                    'purchase_date' => $purchaseDate,
                    'notes' => $data['notes'] ?? null,
                    'user_id' => $userId,
                ]);

                // Store balance must include this line before the next line of the same product is costed.
                $this->move($product->id, 'store', $qty, 'purchase', $unitCost, 'purchase', $purchase->id, $invoice, $userId);

                if ($supplier) {
                    $this->suppliers->post($supplier, 'purchase', $lineTotal, '0', $ledgerDate, $purchase->id, null, $invoice, $userId);
                }
                $purchases[] = $purchase->setRelation('product', $product);
            }

            if ($supplier && Money::cmp($paid, 0) > 0) {
                $this->suppliers->post($supplier, 'payment', '0', $paid, $ledgerDate, $purchases[0]->id, $data['payment_method'] ?? 'cash', $invoice, $userId);
            }

            return $purchases;
        });
    }

    /**
     * Store → Shop transfer for one or more products.
     *
     * @param  array<int, array{product_id:int, quantity:int}>  $items
     * @return list<StockTransfer>
     */
    public function transfer(array $items, ?string $notes, ?int $userId): array
    {
        // Merge duplicate lines and lock in a stable order to avoid deadlocks.
        $merged = [];
        foreach ($items as $item) {
            $merged[(int) $item['product_id']] = ($merged[(int) $item['product_id']] ?? 0) + (int) $item['quantity'];
        }
        ksort($merged);

        return DB::transaction(function () use ($merged, $notes, $userId) {
            $products = Product::whereIn('id', array_keys($merged))->get()->keyBy('id');
            $transfers = [];

            foreach ($merged as $productId => $qty) {
                $store = $this->lockBalance('store', $productId);
                if ($qty > $store->quantity) {
                    throw new BusinessException('INSUFFICIENT_STORE_STOCK', [
                        'product' => $products[$productId]->name,
                        'available' => $store->quantity,
                        'product_id' => $productId,
                    ]);
                }

                $transfer = StockTransfer::create([
                    'product_id' => $productId,
                    'quantity' => $qty,
                    'notes' => $notes,
                    'user_id' => $userId,
                ]);
                $cost = $products[$productId]->avg_cost;
                $this->move($productId, 'store', -$qty, 'transfer_out', $cost, 'transfer', $transfer->id, $notes, $userId);
                $this->move($productId, 'shop', $qty, 'transfer_in', $cost, 'transfer', $transfer->id, $notes, $userId);
                $transfers[] = $transfer->setRelation('product', $products[$productId]);
            }

            return $transfers;
        });
    }

    /** Physical count correction: set the location quantity to the counted value. */
    public function adjust(int $productId, string $location, int $actualQty, string $reason, ?string $notes, ?int $userId): StockAdjustment
    {
        return DB::transaction(function () use ($productId, $location, $actualQty, $reason, $notes, $userId) {
            $balance = $this->lockBalance($location, $productId);
            $difference = $actualQty - $balance->quantity;
            if ($difference === 0) {
                throw new BusinessException('NO_CHANGE');
            }

            $adjustment = StockAdjustment::create([
                'product_id' => $productId,
                'location' => $location,
                'previous_qty' => $balance->quantity,
                'new_qty' => $actualQty,
                'difference' => $difference,
                'reason' => $reason,
                'notes' => $notes,
                'user_id' => $userId,
            ]);

            $cost = Product::whereKey($productId)->value('avg_cost');
            $this->move($productId, $location, $difference, 'adjustment', $cost, 'adjustment', $adjustment->id, $reason, $userId);

            return $adjustment->load('product');
        });
    }

    /**
     * Update the weighted average cost for incoming stock. Must be called with the product
     * row locked, before the incoming quantity is added to the balances.
     */
    public function receiveAtCost(Product $product, int $qty, string $unitCost): void
    {
        $onHand = (int) StoreStock::where('product_id', $product->id)->value('quantity')
            + (int) ShopStock::where('product_id', $product->id)->value('quantity');

        $product->avg_cost = $onHand > 0
            ? Money::round(Money::div(Money::add(Money::mul($onHand, $product->avg_cost), Money::mul($qty, $unitCost)), $onHand + $qty), 4)
            : Money::round($unitCost, 4);
    }

    /**
     * Apply a signed quantity change to a location and record it in the ledger.
     * Throws if the balance would go negative. Must run inside a DB transaction.
     */
    public function move(
        int $productId,
        string $location,
        int $delta,
        string $type,
        string|float|null $unitCost = null,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $notes = null,
        ?int $userId = null,
    ): int {
        $balance = $this->lockBalance($location, $productId);
        $newQty = $balance->quantity + $delta;

        if ($newQty < 0) {
            throw new BusinessException($location === 'store' ? 'INSUFFICIENT_STORE_STOCK' : 'INSUFFICIENT_STOCK', [
                'product' => Product::whereKey($productId)->value('name'),
                'available' => $balance->quantity,
                'product_id' => $productId,
            ]);
        }

        $balance->quantity = $newQty;
        $balance->save();

        StockTransaction::create([
            'product_id' => $productId,
            'location' => $location,
            'type' => $type,
            'quantity' => $delta,
            'balance_after' => $newQty,
            'unit_cost' => $unitCost,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'notes' => $notes ? mb_substr($notes, 0, 255) : null,
            'user_id' => $userId,
        ]);

        return $newQty;
    }

    public function lockBalance(string $location, int $productId): StoreStock|ShopStock
    {
        $model = $location === 'store' ? StoreStock::class : ShopStock::class;

        return $model::where('product_id', $productId)->lockForUpdate()->first()
            ?? $model::create(['product_id' => $productId, 'quantity' => 0]);
    }
}

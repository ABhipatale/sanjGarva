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

    /** Purchase / stock received into the Store. */
    public function addPurchase(array $data, ?int $userId): Purchase
    {
        return DB::transaction(function () use ($data, $userId) {
            $product = Product::whereKey($data['product_id'])->lockForUpdate()->firstOrFail();
            $qty = (int) $data['quantity'];
            $unitCost = Money::round($data['cost_price'], 2);

            $this->receiveAtCost($product, $qty, $unitCost);
            $product->cost_price = $unitCost;
            if (isset($data['selling_price']) && $data['selling_price'] !== '') {
                $product->selling_price = Money::round($data['selling_price'], 2);
            }
            $product->save();

            $purchase = Purchase::create([
                'product_id' => $product->id,
                'quantity' => $qty,
                'unit_cost' => $unitCost,
                'total_cost' => Money::round(Money::mul($qty, $unitCost), 2),
                'selling_price' => $data['selling_price'] ?? null,
                'supplier' => $data['supplier'] ?? null,
                'invoice_no' => $data['invoice_no'] ?? null,
                'purchase_date' => $data['purchase_date'] ?? now()->toDateString(),
                'notes' => $data['notes'] ?? null,
                'user_id' => $userId,
            ]);

            $this->move($product->id, 'store', $qty, 'purchase', $unitCost, 'purchase', $purchase->id, $data['invoice_no'] ?? null, $userId);

            return $purchase->load('product');
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

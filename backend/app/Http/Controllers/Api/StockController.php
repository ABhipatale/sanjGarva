<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Requests\AddStockRequest;
use App\Http\Requests\AdjustStockRequest;
use App\Http\Requests\TransferRequest;
use App\Http\Resources\AdjustmentResource;
use App\Http\Resources\ProductResource;
use App\Http\Resources\PurchaseResource;
use App\Http\Resources\StockTransactionResource;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\StockAdjustment;
use App\Models\StockTransaction;
use App\Services\ReportService;
use App\Services\StockService;
use App\Support\DateRange;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockController extends Controller
{
    use RespondsWithJson;

    public function __construct(
        private readonly StockService $stock,
        private readonly ReportService $reports,
    ) {}

    public function store(Request $request): JsonResponse
    {
        return $this->locationIndex($request, 'store');
    }

    public function shop(Request $request): JsonResponse
    {
        return $this->locationIndex($request, 'shop');
    }

    public function add(AddStockRequest $request): JsonResponse
    {
        $purchase = $this->stock->addPurchase($request->validated(), $request->user()?->id);

        return $this->created(PurchaseResource::make($purchase)->resolve(), __('messages.stock_added'));
    }

    public function purchases(Request $request): JsonResponse
    {
        $range = DateRange::fromRequest($request, 'all');
        $purchases = Purchase::with('product:id,name,name_mr,unit')
            ->when($request->filled('product_id'), fn ($q) => $q->where('product_id', $request->integer('product_id')))
            ->when($range->from, fn ($q) => $q->where('purchase_date', '>=', $range->from->toDateString()))
            ->when($range->to, fn ($q) => $q->where('purchase_date', '<=', $range->to->toDateString()))
            ->orderByDesc('purchase_date')->orderByDesc('id')
            ->paginate($this->perPage());

        return $this->paginated($purchases, PurchaseResource::class);
    }

    public function transfer(TransferRequest $request): JsonResponse
    {
        $data = $request->validated();
        $transfers = $this->stock->transfer($data['items'], $data['notes'] ?? null, $request->user()?->id);
        $qty = array_sum(array_map(fn ($t) => $t->quantity, $transfers));

        return $this->created(
            array_map(fn ($t) => [
                'id' => $t->id,
                'product_id' => $t->product_id,
                'product_name' => $t->product->name,
                'quantity' => $t->quantity,
                'created_at' => $t->created_at->toIso8601String(),
            ], $transfers),
            __('messages.transferred', ['qty' => $qty]),
        );
    }

    public function adjust(AdjustStockRequest $request): JsonResponse
    {
        $data = $request->validated();
        $adjustment = $this->stock->adjust(
            (int) $data['product_id'],
            $data['location'],
            (int) $data['actual_quantity'],
            $data['reason'],
            $data['notes'] ?? null,
            $request->user()?->id,
        );

        return $this->created(AdjustmentResource::make($adjustment)->resolve(), __('messages.adjusted'));
    }

    public function adjustments(Request $request): JsonResponse
    {
        $items = StockAdjustment::with('product:id,name,name_mr,unit')
            ->when($request->filled('product_id'), fn ($q) => $q->where('product_id', $request->integer('product_id')))
            ->orderByDesc('id')
            ->paginate($this->perPage());

        return $this->paginated($items, AdjustmentResource::class);
    }

    /** Stock ledger: ?product_id=&location=&type=&from=&to= */
    public function movements(Request $request): JsonResponse
    {
        $range = DateRange::fromRequest($request, 'all');
        $movements = StockTransaction::with('product:id,name,name_mr,unit')
            ->when($request->filled('product_id'), fn ($q) => $q->where('product_id', $request->integer('product_id')))
            ->when(in_array($request->query('location'), StockTransaction::LOCATIONS, true), fn ($q) => $q->where('location', $request->query('location')))
            ->when(in_array($request->query('type'), StockTransaction::TYPES, true), fn ($q) => $q->where('type', $request->query('type')))
            ->when($range->from, fn ($q) => $q->where('created_at', '>=', $range->from))
            ->when($range->to, fn ($q) => $q->where('created_at', '<=', $range->to))
            ->orderByDesc('id')
            ->paginate($this->perPage(30));

        return $this->paginated($movements, StockTransactionResource::class);
    }

    /**
     * Products with quantity at one location. ?search=&status=good|low|out&category_id=
     */
    private function locationIndex(Request $request, string $location): JsonResponse
    {
        $qty = "COALESCE({$location}_stock.quantity, 0)";

        $query = Product::query()->withStock()
            ->with('category:id,name,name_mr')
            ->where('products.is_active', true)
            ->search($request->query('search'))
            ->when($request->filled('category_id'), fn ($q) => $q->where('products.category_id', $request->integer('category_id')));

        match ($request->query('status')) {
            'out' => $query->whereRaw("$qty <= 0"),
            'low' => $query->whereRaw("$qty > 0 AND $qty <= products.min_stock"),
            'good' => $query->whereRaw("$qty > products.min_stock"),
            'attention' => $query->whereRaw("$qty <= products.min_stock"),
            default => null,
        };

        $products = $query->orderBy('products.name')->paginate($this->perPage(30));

        $table = "{$location}_stock";
        $totals = DB::table('products')
            ->leftJoin($table, "$table.product_id", '=', 'products.id')
            ->where('products.is_active', true)
            ->selectRaw("COALESCE(SUM($table.quantity), 0) AS qty")
            ->selectRaw("COALESCE(SUM($table.quantity * products.avg_cost), 0) AS value")
            ->first();

        $counts = $this->reports->stockStatusCounts($table);

        return $this->paginated($products, ProductResource::class, [
            'summary' => [
                'location' => $location,
                'products' => $counts['products'],
                'total_qty' => (int) $totals->qty,
                'stock_value' => Money::round($totals->value, 2),
                'low' => $counts['low'],
                'out' => $counts['out'],
            ],
        ]);
    }
}

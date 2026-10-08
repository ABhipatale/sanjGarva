<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\BusinessException;
use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Requests\ProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\StockTransaction;
use App\Services\StockService;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly StockService $stock) {}

    /**
     * ?search=&category_id=&status=active|inactive|all&in_shop=1&per_page=
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::query()->withStock()
            ->with(['category:id,name,name_mr', 'subCategory:id,name,name_mr'])
            ->search($request->query('search'))
            ->when($request->filled('category_id'), fn ($q) => $q->where(fn ($w) => $w
                ->where('products.category_id', $request->integer('category_id'))
                ->orWhere('products.sub_category_id', $request->integer('category_id'))))
            ->when($request->boolean('in_shop'), fn ($q) => $q->where('shop_stock.quantity', '>', 0));

        $status = $request->query('status', 'active');
        if ($status !== 'all') {
            $query->where('products.is_active', $status !== 'inactive');
        }

        $products = $query->orderBy('products.name')->paginate($this->perPage(30));

        return $this->paginated($products, ProductResource::class);
    }

    public function show(int $id): JsonResponse
    {
        $product = Product::query()->withStock()->with(['category', 'subCategory'])->where('products.id', $id)->firstOrFail();

        return $this->ok(ProductResource::make($product)->resolve());
    }

    public function store(ProductRequest $request): JsonResponse
    {
        $data = $request->validated();

        $product = DB::transaction(function () use ($data, $request) {
            $product = Product::create(array_merge($this->attributes($data), [
                'avg_cost' => Money::round($data['cost_price'], 4),
            ]));
            $this->stock->initialize(
                $product,
                (int) ($data['opening_store'] ?? 0),
                (int) ($data['opening_shop'] ?? 0),
                $request->user()?->id,
            );

            return $product;
        });

        return $this->created($this->fresh($product->id), __('messages.saved'));
    }

    public function update(ProductRequest $request, Product $product): JsonResponse
    {
        $data = $this->attributes($request->validated());
        // If the product never had stock, keep avg cost aligned with the entered cost price.
        if (! StockTransaction::where('product_id', $product->id)->exists()) {
            $data['avg_cost'] = Money::round($data['cost_price'], 4);
        }
        $product->update($data);

        return $this->ok($this->fresh($product->id), __('messages.saved'));
    }

    public function destroy(Product $product): JsonResponse
    {
        $hasHistory = StockTransaction::where('product_id', $product->id)->exists()
            || DB::table('sale_items')->where('product_id', $product->id)->exists()
            || DB::table('purchases')->where('product_id', $product->id)->exists();

        if ($hasHistory) {
            throw new BusinessException('HAS_HISTORY');
        }
        $product->delete();

        return $this->ok(null, __('messages.deleted'));
    }

    private function attributes(array $data): array
    {
        return [
            'name' => trim($data['name']),
            'name_mr' => $data['name_mr'] ?? null,
            'category_id' => $data['category_id'] ?? null,
            'sub_category_id' => $data['sub_category_id'] ?? null,
            'brand' => $data['brand'] ?? null,
            'unit' => $data['unit'],
            'bottle_size' => $data['bottle_size'] ?? null,
            'min_stock' => (int) $data['min_stock'],
            'cost_price' => Money::round($data['cost_price'], 2),
            'selling_price' => Money::round($data['selling_price'], 2),
            'is_active' => $data['is_active'] ?? true,
        ];
    }

    private function fresh(int $id): array
    {
        $product = Product::query()->withStock()->with(['category', 'subCategory'])->where('products.id', $id)->firstOrFail();

        return ProductResource::make($product)->resolve();
    }
}

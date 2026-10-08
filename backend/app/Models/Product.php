<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;

class Product extends Model
{
    public const UNITS = ['bottle', 'can', 'case', 'box', 'piece', 'peg'];

    protected $fillable = [
        'name', 'name_mr', 'category_id', 'sub_category_id', 'brand', 'unit', 'bottle_size',
        'min_stock', 'cost_price', 'avg_cost', 'selling_price', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'min_stock' => 'integer',
            'cost_price' => 'decimal:2',
            'avg_cost' => 'decimal:4',
            'selling_price' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function subCategory(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'sub_category_id');
    }

    public function storeStock(): HasOne
    {
        return $this->hasOne(StoreStock::class);
    }

    public function shopStock(): HasOne
    {
        return $this->hasOne(ShopStock::class);
    }

    public function stockTransactions(): HasMany
    {
        return $this->hasMany(StockTransaction::class);
    }

    /** Adds store_qty and shop_qty columns via LEFT JOINs (one query, no N+1). */
    public function scopeWithStock(Builder $query): Builder
    {
        return $query
            ->leftJoin('store_stock', 'store_stock.product_id', '=', 'products.id')
            ->leftJoin('shop_stock', 'shop_stock.product_id', '=', 'products.id')
            ->select('products.*')
            ->addSelect(DB::raw('COALESCE(store_stock.quantity, 0) AS store_qty'))
            ->addSelect(DB::raw('COALESCE(shop_stock.quantity, 0) AS shop_qty'));
    }

    /** Case-insensitive search on name, Marathi name, brand and category name. */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        $term = trim((string) $term);
        if ($term === '') {
            return $query;
        }
        $op = DB::getDriverName() === 'pgsql' ? 'ILIKE' : 'LIKE';
        $like = '%'.addcslashes($term, '%_\\').'%';

        return $query->where(function (Builder $q) use ($op, $like) {
            $q->where('products.name', $op, $like)
                ->orWhere('products.name_mr', $op, $like)
                ->orWhere('products.brand', $op, $like)
                ->orWhereIn('products.category_id', Category::query()
                    ->select('id')
                    ->where('name', $op, $like)
                    ->orWhere('name_mr', $op, $like));
        });
    }

    /**
     * Stock status for a location quantity: good | low | out.
     */
    public static function statusFor(int $qty, int $minStock): string
    {
        if ($qty <= 0) {
            return 'out';
        }

        return $qty <= $minStock ? 'low' : 'good';
    }
}

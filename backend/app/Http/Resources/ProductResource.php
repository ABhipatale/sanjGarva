<?php

namespace App\Http\Resources;

use App\Models\Product;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Product */
class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $hasStock = array_key_exists('store_qty', $this->getAttributes());
        $storeQty = (int) ($this->store_qty ?? 0);
        $shopQty = (int) ($this->shop_qty ?? 0);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'name_mr' => $this->name_mr,
            'category_id' => $this->category_id,
            'sub_category_id' => $this->sub_category_id,
            'category' => $this->whenLoaded('category', fn () => $this->category ? [
                'id' => $this->category->id, 'name' => $this->category->name, 'name_mr' => $this->category->name_mr,
            ] : null),
            'sub_category' => $this->whenLoaded('subCategory', fn () => $this->subCategory ? [
                'id' => $this->subCategory->id, 'name' => $this->subCategory->name, 'name_mr' => $this->subCategory->name_mr,
            ] : null),
            'brand' => $this->brand,
            'unit' => $this->unit,
            'bottle_size' => $this->bottle_size,
            'min_stock' => $this->min_stock,
            'cost_price' => $this->cost_price,
            'avg_cost' => Money::round($this->avg_cost, 2),
            'selling_price' => $this->selling_price,
            'profit_per_unit' => Money::round(Money::sub($this->selling_price, $this->cost_price), 2),
            'is_active' => $this->is_active,
            $this->mergeWhen($hasStock, fn () => [
                'store_qty' => $storeQty,
                'shop_qty' => $shopQty,
                'store_status' => Product::statusFor($storeQty, $this->min_stock),
                'shop_status' => Product::statusFor($shopQty, $this->min_stock),
                'store_value' => Money::round(Money::mul($storeQty, $this->avg_cost), 2),
                'shop_value' => Money::round(Money::mul($shopQty, $this->avg_cost), 2),
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

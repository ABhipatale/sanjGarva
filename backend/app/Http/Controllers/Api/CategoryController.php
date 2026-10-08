<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\BusinessException;
use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Requests\CategoryRequest;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    use RespondsWithJson;

    public function index(): JsonResponse
    {
        $categories = Category::query()
            ->withCount('products')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'name_mr', 'parent_id', 'sort_order']);

        return $this->ok($categories);
    }

    public function store(CategoryRequest $request): JsonResponse
    {
        return $this->created(Category::create($request->validated()), __('messages.saved'));
    }

    public function update(CategoryRequest $request, Category $category): JsonResponse
    {
        $data = $request->validated();
        if (($data['parent_id'] ?? null) === $category->id) {
            $data['parent_id'] = null;
        }
        $category->update($data);

        return $this->ok($category, __('messages.saved'));
    }

    public function destroy(Category $category): JsonResponse
    {
        $used = Product::where('category_id', $category->id)->orWhere('sub_category_id', $category->id)->exists()
            || $category->children()->exists();
        if ($used) {
            throw new BusinessException('HAS_HISTORY');
        }
        $category->delete();

        return $this->ok(null, __('messages.deleted'));
    }
}

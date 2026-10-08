<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\BusinessException;
use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Requests\ExpenseCategoryRequest;
use App\Models\ExpenseCategory;
use Illuminate\Http\JsonResponse;

class ExpenseCategoryController extends Controller
{
    use RespondsWithJson;

    public function index(): JsonResponse
    {
        return $this->ok(ExpenseCategory::orderBy('sort_order')->orderBy('name')->get());
    }

    public function store(ExpenseCategoryRequest $request): JsonResponse
    {
        $data = $request->validated() + ['sort_order' => (int) ExpenseCategory::max('sort_order') + 1];

        return $this->created(ExpenseCategory::create($data), __('messages.saved'));
    }

    public function update(ExpenseCategoryRequest $request, ExpenseCategory $expenseCategory): JsonResponse
    {
        $expenseCategory->update($request->validated());

        return $this->ok($expenseCategory, __('messages.saved'));
    }

    public function destroy(ExpenseCategory $expenseCategory): JsonResponse
    {
        if ($expenseCategory->expenses()->exists()) {
            throw new BusinessException('HAS_HISTORY');
        }
        $expenseCategory->delete();

        return $this->ok(null, __('messages.deleted'));
    }
}

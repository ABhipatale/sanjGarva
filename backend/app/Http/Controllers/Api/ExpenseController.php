<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Requests\ExpenseRequest;
use App\Http\Resources\ExpenseResource;
use App\Models\Expense;
use App\Services\ReportService;
use App\Support\DateRange;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly ReportService $reports) {}

    /** ?period=&from=&to=&category_id= */
    public function index(Request $request): JsonResponse
    {
        $range = DateRange::fromRequest($request, 'month');

        $expenses = Expense::with('category:id,name,name_mr')
            ->when($range->from, fn ($q) => $q->where('expense_date', '>=', $range->from->toDateString()))
            ->when($range->to, fn ($q) => $q->where('expense_date', '<=', $range->to->toDateString()))
            ->when($request->filled('category_id'), fn ($q) => $q->where('expense_category_id', $request->integer('category_id')))
            ->orderByDesc('expense_date')->orderByDesc('id')
            ->paginate($this->perPage());

        return $this->paginated($expenses, ExpenseResource::class, [
            'range' => $range->toArray(),
            'summary' => [
                'total' => $this->reports->expenseTotal($range),
                'by_category' => $this->reports->expensesByCategory($range),
            ],
        ]);
    }

    public function store(ExpenseRequest $request): JsonResponse
    {
        $expense = Expense::create($request->validated() + [
            'payment_method' => $request->input('payment_method') ?: 'cash',
            'user_id' => $request->user()?->id,
        ]);

        return $this->created(ExpenseResource::make($expense->load('category'))->resolve(), __('messages.saved'));
    }

    public function update(ExpenseRequest $request, Expense $expense): JsonResponse
    {
        $expense->update(array_merge($request->validated(), [
            'payment_method' => $request->input('payment_method') ?: 'cash',
        ]));

        return $this->ok(ExpenseResource::make($expense->load('category'))->resolve(), __('messages.saved'));
    }

    public function destroy(Expense $expense): JsonResponse
    {
        $expense->delete();

        return $this->ok(null, __('messages.deleted'));
    }
}

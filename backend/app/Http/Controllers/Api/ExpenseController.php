<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Requests\ExpenseRequest;
use App\Http\Resources\ExpenseResource;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Services\ReportService;
use App\Support\DateRange;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly ReportService $reports) {}

    /** ?kind=bar|home&period=&from=&to=&category_id= */
    public function index(Request $request): JsonResponse
    {
        $range = DateRange::fromRequest($request, 'month');
        $kind = in_array($request->query('kind'), ExpenseCategory::KINDS, true) ? $request->query('kind') : 'bar';

        $expenses = Expense::with('category:id,name,name_mr,kind')
            ->ofKind($kind)
            ->when($range->from, fn ($q) => $q->where('expense_date', '>=', $range->from->toDateString()))
            ->when($range->to, fn ($q) => $q->where('expense_date', '<=', $range->to->toDateString()))
            ->when($request->filled('category_id'), fn ($q) => $q->where('expense_category_id', $request->integer('category_id')))
            ->orderByDesc('expense_date')->orderByDesc('id')
            ->paginate($this->perPage());

        $summary = [
            'kind' => $kind,
            'total' => $this->reports->expenseTotal($range, $kind),
            'by_category' => $this->reports->expensesByCategory($range, $kind),
        ];

        if ($kind === 'home') {
            // Shown only here: what is left of the bar's net profit after household spending.
            $netProfit = $this->reports->profitLoss($range)['net_profit'];
            $summary['bar_net_profit'] = $netProfit;
            $summary['after_home'] = Money::round(Money::sub($netProfit, $summary['total']), 2);
        }

        return $this->paginated($expenses, ExpenseResource::class, [
            'range' => $range->toArray(),
            'summary' => $summary,
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

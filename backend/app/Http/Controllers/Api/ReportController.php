<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Services\ReportService;
use App\Support\DateRange;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly ReportService $reports) {}

    /** ?period=&from=&to=&group=day|week|month */
    public function sales(Request $request): JsonResponse
    {
        $range = DateRange::fromRequest($request, 'month');
        $group = in_array($request->query('group'), ['day', 'week', 'month'], true) ? $request->query('group') : 'day';

        return $this->ok([
            'range' => $range->toArray(),
            'group' => $group,
            'summary' => $this->reports->salesSummary($range),
            'rows' => $this->reports->salesSeries($range, $group),
            'top_products' => $this->reports->topProducts($range),
        ]);
    }

    public function stock(): JsonResponse
    {
        return $this->ok($this->reports->stock());
    }

    public function profitLoss(Request $request): JsonResponse
    {
        return $this->ok($this->reports->profitLoss(DateRange::fromRequest($request, 'month')));
    }

    public function udhari(Request $request): JsonResponse
    {
        return $this->ok($this->reports->udhari(DateRange::fromRequest($request, 'month')));
    }

    public function expenses(Request $request): JsonResponse
    {
        $range = DateRange::fromRequest($request, 'month');

        return $this->ok([
            'range' => $range->toArray(),
            'total' => $this->reports->expenseTotal($range),
            'by_category' => $this->reports->expensesByCategory($range),
            'by_date' => $this->reports->expensesByDate($range),
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Requests\SaleRequest;
use App\Http\Resources\SaleResource;
use App\Models\Sale;
use App\Services\ReportService;
use App\Services\SaleService;
use App\Support\DateRange;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SaleController extends Controller
{
    use RespondsWithJson;

    public function __construct(
        private readonly SaleService $sales,
        private readonly ReportService $reports,
    ) {}

    /** ?period=&from=&to=&payment_method=&customer_id=&status=&search= (invoice no) */
    public function index(Request $request): JsonResponse
    {
        $range = DateRange::fromRequest($request, 'today');

        $sales = Sale::with('customer:id,name,mobile')
            ->withCount('items')
            ->when($range->from, fn ($q) => $q->where('sold_at', '>=', $range->from))
            ->when($range->to, fn ($q) => $q->where('sold_at', '<=', $range->to))
            ->when(in_array($request->query('payment_method'), Sale::METHODS, true), fn ($q) => $q->where('payment_method', $request->query('payment_method')))
            ->when($request->filled('customer_id'), fn ($q) => $q->where('customer_id', $request->integer('customer_id')))
            ->when(in_array($request->query('status'), ['completed', 'void'], true), fn ($q) => $q->where('status', $request->query('status')))
            ->when($request->filled('search'), fn ($q) => $q->where('invoice_no', 'LIKE', '%'.addcslashes(strtoupper((string) $request->query('search')), '%_\\').'%'))
            ->orderByDesc('sold_at')->orderByDesc('id')
            ->paginate($this->perPage());

        return $this->paginated($sales, SaleResource::class, [
            'range' => $range->toArray(),
            'summary' => $this->reports->salesSummary($range),
        ]);
    }

    public function store(SaleRequest $request): JsonResponse
    {
        $sale = $this->sales->create($request->validated(), $request->user()?->id);

        return $this->created(SaleResource::make($sale)->resolve(), __('messages.sale_saved'));
    }

    public function show(Sale $sale): JsonResponse
    {
        return $this->ok(SaleResource::make($sale->load(['items', 'customer']))->resolve());
    }

    public function void(Request $request, Sale $sale): JsonResponse
    {
        $request->validate(['reason' => ['nullable', 'string', 'max:255']]);
        $sale = $this->sales->void($sale->id, $request->input('reason'), $request->user()?->id);

        return $this->ok(SaleResource::make($sale)->resolve(), __('messages.sale_voided'));
    }
}

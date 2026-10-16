<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\BusinessException;
use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Requests\PaymentRequest;
use App\Http\Requests\SupplierRequest;
use App\Http\Resources\SupplierResource;
use App\Models\Supplier;
use App\Models\SupplierTransaction;
use App\Services\SupplierLedgerService;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly SupplierLedgerService $ledger) {}

    /** ?search=&with_dues=1&sort=name|balance */
    public function index(Request $request): JsonResponse
    {
        $query = Supplier::query()
            ->withTotals()
            ->search($request->query('search'))
            ->when($request->boolean('with_dues'), fn ($q) => $q->where('balance', '>', 0));

        $request->query('sort') === 'balance'
            ? $query->orderByDesc('balance')->orderBy('name')
            : $query->orderBy('name');

        $totals = SupplierTransaction::query()
            ->selectRaw('COALESCE(SUM(debit), 0) AS bought, COALESCE(SUM(credit), 0) AS paid')
            ->toBase()->first();

        return $this->paginated($query->paginate($this->perPage(30)), SupplierResource::class, [
            'summary' => [
                'total_purchase' => Money::round($totals->bought, 2),
                'total_paid' => Money::round($totals->paid, 2),
                'total_unpaid' => Money::round(Supplier::where('balance', '>', 0)->sum('balance'), 2),
                'suppliers_with_dues' => Supplier::where('balance', '>', 0)->count(),
                'suppliers' => Supplier::count(),
            ],
        ]);
    }

    public function store(SupplierRequest $request): JsonResponse
    {
        $supplier = $this->ledger->create($request->validated(), $request->user()?->id);

        return $this->created($this->present($supplier->id), __('messages.saved'));
    }

    public function show(Supplier $supplier): JsonResponse
    {
        return $this->ok($this->present($supplier->id));
    }

    public function update(SupplierRequest $request, Supplier $supplier): JsonResponse
    {
        // Opening balance can only be set when the supplier is created (it is a ledger entry).
        $supplier->update(collect($request->validated())->only(['name', 'mobile', 'address', 'notes'])->all());

        return $this->ok($this->present($supplier->id), __('messages.saved'));
    }

    public function destroy(Supplier $supplier): JsonResponse
    {
        if ($supplier->purchases()->exists() || $supplier->transactions()->where('type', '!=', 'opening')->exists()
            || Money::cmp($supplier->balance, 0) !== 0) {
            throw new BusinessException('HAS_HISTORY');
        }
        $supplier->transactions()->delete();
        $supplier->delete();

        return $this->ok(null, __('messages.deleted'));
    }

    public function ledger(Supplier $supplier): JsonResponse
    {
        return $this->ok(array_merge(
            ['supplier' => $this->present($supplier->id)],
            $this->ledger->ledger($supplier),
        ));
    }

    public function payment(PaymentRequest $request, Supplier $supplier): JsonResponse
    {
        $tx = $this->ledger->pay($supplier->id, $request->validated(), $request->user()?->id);

        return $this->created([
            'transaction_id' => $tx->id,
            'amount' => $tx->credit,
            'balance' => $tx->balance_after,
            'supplier' => $this->present($supplier->id),
        ], __('messages.supplier_paid'));
    }

    private function present(int $id): array
    {
        return SupplierResource::make(Supplier::withTotals()->findOrFail($id))->resolve();
    }
}

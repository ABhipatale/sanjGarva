<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\BusinessException;
use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Requests\CustomerRequest;
use App\Http\Requests\PaymentRequest;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use App\Services\CustomerLedgerService;
use App\Support\DateRange;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly CustomerLedgerService $ledger) {}

    /** ?search=&with_dues=1&sort=name|balance|recent */
    public function index(Request $request): JsonResponse
    {
        $query = Customer::query()
            ->withTotals()
            ->search($request->query('search'))
            ->when($request->boolean('with_dues'), fn ($q) => $q->where('balance', '>', 0));

        match ($request->query('sort')) {
            'balance' => $query->orderByDesc('balance')->orderBy('name'),
            'recent' => $query->orderByDesc('updated_at'),
            default => $query->orderBy('name'),
        };

        $summary = Customer::where('balance', '>', 0)
            ->selectRaw('COALESCE(SUM(balance), 0) AS total, COUNT(*) AS count')
            ->toBase()->first();

        return $this->paginated($query->paginate($this->perPage(30)), CustomerResource::class, [
            'summary' => [
                'total_outstanding' => Money::round($summary->total, 2),
                'customers_with_dues' => (int) $summary->count,
                'customers' => Customer::count(),
            ],
        ]);
    }

    public function store(CustomerRequest $request): JsonResponse
    {
        $customer = $this->ledger->create($request->validated(), $request->user()?->id);

        return $this->created($this->present($customer->id), __('messages.saved'));
    }

    public function show(Customer $customer): JsonResponse
    {
        return $this->ok($this->present($customer->id));
    }

    public function update(CustomerRequest $request, Customer $customer): JsonResponse
    {
        // Opening balance can only be set when the customer is created (it is a ledger entry).
        $customer->update(collect($request->validated())->only(['name', 'mobile', 'address', 'notes'])->all());

        return $this->ok($this->present($customer->id), __('messages.saved'));
    }

    public function destroy(Customer $customer): JsonResponse
    {
        if ($customer->sales()->exists() || $customer->transactions()->where('type', '!=', 'opening')->exists()
            || Money::cmp($customer->balance, 0) !== 0) {
            throw new BusinessException('HAS_HISTORY');
        }
        $customer->transactions()->delete();
        $customer->delete();

        return $this->ok(null, __('messages.deleted'));
    }

    public function ledger(Request $request, Customer $customer): JsonResponse
    {
        $range = DateRange::fromRequest($request, 'all');

        return $this->ok(array_merge(
            ['customer' => $this->present($customer->id), 'range' => $range->toArray()],
            $this->ledger->ledger($customer, $range->from, $range->to),
        ));
    }

    public function payment(PaymentRequest $request, Customer $customer): JsonResponse
    {
        $tx = $this->ledger->receivePayment($customer->id, $request->validated(), $request->user()?->id);

        return $this->created([
            'transaction_id' => $tx->id,
            'amount' => $tx->credit,
            'balance' => $tx->balance_after,
            'customer' => $this->present($customer->id),
        ], __('messages.payment_received'));
    }

    private function present(int $id): array
    {
        return CustomerResource::make(Customer::withTotals()->findOrFail($id))->resolve();
    }
}

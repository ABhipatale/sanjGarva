<?php

namespace App\Services;

use App\Exceptions\BusinessException;
use App\Models\Customer;
use App\Models\CustomerTransaction;
use App\Support\Money;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Udhari / khata book. Every balance change is a customer_transactions row and the cached
 * customers.balance is updated in the same DB transaction.
 */
class CustomerLedgerService
{
    public function create(array $data, ?int $userId): Customer
    {
        return DB::transaction(function () use ($data, $userId) {
            $opening = Money::round($data['opening_balance'] ?? 0, 2);
            $customer = Customer::create([
                'name' => $data['name'],
                'mobile' => $data['mobile'] ?? null,
                'address' => $data['address'] ?? null,
                'notes' => $data['notes'] ?? null,
                'opening_balance' => $opening,
                'balance' => 0,
            ]);

            if (Money::cmp($opening, 0) > 0) {
                $this->post($customer, 'opening', $opening, '0', now(), null, null, null, $userId);
            }

            return $customer;
        });
    }

    public function receivePayment(int $customerId, array $data, ?int $userId): CustomerTransaction
    {
        return DB::transaction(function () use ($customerId, $data, $userId) {
            $customer = Customer::whereKey($customerId)->lockForUpdate()->firstOrFail();
            $amount = Money::round($data['amount'], 2);

            if (Money::cmp($amount, $customer->balance) > 0) {
                throw new BusinessException('PAYMENT_EXCEEDS_BALANCE', ['balance' => $customer->balance]);
            }

            $date = isset($data['payment_date'])
                ? now()->setDateFrom(\Illuminate\Support\Carbon::parse($data['payment_date']))
                : now();

            return $this->post($customer, 'payment', '0', $amount, $date, null, $data['payment_method'] ?? 'cash', $data['notes'] ?? null, $userId);
        });
    }

    /**
     * Post a debit (udhari) or credit (payment) to an already locked customer row.
     */
    public function post(
        Customer $customer,
        string $type,
        string $debit,
        string $credit,
        CarbonInterface $date,
        ?int $saleId = null,
        ?string $paymentMethod = null,
        ?string $notes = null,
        ?int $userId = null,
    ): CustomerTransaction {
        $newBalance = Money::round(Money::sub(Money::add($customer->balance, $debit), $credit), 2);

        $transaction = CustomerTransaction::create([
            'customer_id' => $customer->id,
            'type' => $type,
            'debit' => $debit,
            'credit' => $credit,
            'balance_after' => $newBalance,
            'sale_id' => $saleId,
            'payment_method' => $paymentMethod,
            'transaction_date' => $date,
            'notes' => $notes ? mb_substr($notes, 0, 255) : null,
            'user_id' => $userId,
        ]);

        $customer->balance = $newBalance;
        $customer->save();

        return $transaction;
    }

    /**
     * Ledger with a running balance computed in date order (robust to back-dated payments).
     */
    public function ledger(Customer $customer, ?CarbonInterface $from, ?CarbonInterface $to): array
    {
        $opening = '0';
        if ($from) {
            $row = CustomerTransaction::where('customer_id', $customer->id)
                ->where('transaction_date', '<', $from)
                ->selectRaw('COALESCE(SUM(debit), 0) AS d, COALESCE(SUM(credit), 0) AS c')
                ->first();
            $opening = Money::round(Money::sub($row->d, $row->c), 2);
        }

        $transactions = CustomerTransaction::with('sale:id,invoice_no')
            ->where('customer_id', $customer->id)
            ->when($from, fn ($q) => $q->where('transaction_date', '>=', $from))
            ->when($to, fn ($q) => $q->where('transaction_date', '<=', $to))
            ->orderBy('transaction_date')
            ->orderBy('id')
            ->get();

        $running = $opening;
        $totalDebit = '0';
        $totalCredit = '0';
        $entries = $transactions->map(function (CustomerTransaction $tx) use (&$running, &$totalDebit, &$totalCredit) {
            $running = Money::round(Money::sub(Money::add($running, $tx->debit), $tx->credit), 2);
            $totalDebit = Money::add($totalDebit, $tx->debit);
            $totalCredit = Money::add($totalCredit, $tx->credit);

            return [
                'id' => $tx->id,
                'date' => $tx->transaction_date->toIso8601String(),
                'type' => $tx->type,
                'invoice_no' => $tx->sale?->invoice_no,
                'sale_id' => $tx->sale_id,
                'payment_method' => $tx->payment_method,
                'notes' => $tx->notes,
                'debit' => $tx->debit,
                'credit' => $tx->credit,
                'balance' => $running,
            ];
        });

        return [
            'opening_balance' => $opening,
            'entries' => $entries->values(),
            'total_debit' => Money::round($totalDebit, 2),
            'total_credit' => Money::round($totalCredit, 2),
            'closing_balance' => $running,
        ];
    }
}

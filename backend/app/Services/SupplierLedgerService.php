<?php

namespace App\Services;

use App\Exceptions\BusinessException;
use App\Models\Supplier;
use App\Models\SupplierTransaction;
use App\Support\Money;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Supplier khata: what the bar owes each supplier. Purchases post a debit (unpaid goes up),
 * payments post a credit. The cached suppliers.balance is updated in the same DB transaction.
 */
class SupplierLedgerService
{
    public function create(array $data, ?int $userId): Supplier
    {
        return DB::transaction(function () use ($data, $userId) {
            $opening = Money::round($data['opening_balance'] ?? 0, 2);
            $supplier = Supplier::create([
                'name' => $data['name'],
                'mobile' => $data['mobile'] ?? null,
                'address' => $data['address'] ?? null,
                'notes' => $data['notes'] ?? null,
                'opening_balance' => $opening,
                'balance' => 0,
            ]);

            if (Money::cmp($opening, 0) > 0) {
                $this->post($supplier, 'opening', $opening, '0', now(), null, null, null, $userId);
            }

            return $supplier;
        });
    }

    public function pay(int $supplierId, array $data, ?int $userId): SupplierTransaction
    {
        return DB::transaction(function () use ($supplierId, $data, $userId) {
            $supplier = Supplier::whereKey($supplierId)->lockForUpdate()->firstOrFail();
            $amount = Money::round($data['amount'], 2);

            if (Money::cmp($amount, $supplier->balance) > 0) {
                throw new BusinessException('SUPPLIER_PAYMENT_EXCEEDS_BALANCE', ['balance' => $supplier->balance]);
            }

            $date = isset($data['payment_date']) ? now()->setDateFrom(Carbon::parse($data['payment_date'])) : now();

            return $this->post($supplier, 'payment', '0', $amount, $date, null, $data['payment_method'] ?? 'cash', $data['notes'] ?? null, $userId);
        });
    }

    /** Post a debit (bought) or credit (paid) to an already locked supplier row. */
    public function post(
        Supplier $supplier,
        string $type,
        string $debit,
        string $credit,
        CarbonInterface $date,
        ?int $purchaseId = null,
        ?string $paymentMethod = null,
        ?string $notes = null,
        ?int $userId = null,
    ): SupplierTransaction {
        $newBalance = Money::round(Money::sub(Money::add($supplier->balance, $debit), $credit), 2);

        $transaction = SupplierTransaction::create([
            'supplier_id' => $supplier->id,
            'type' => $type,
            'debit' => $debit,
            'credit' => $credit,
            'balance_after' => $newBalance,
            'purchase_id' => $purchaseId,
            'payment_method' => $paymentMethod,
            'transaction_date' => $date,
            'notes' => $notes ? mb_substr($notes, 0, 255) : null,
            'user_id' => $userId,
        ]);

        $supplier->balance = $newBalance;
        $supplier->save();

        return $transaction;
    }

    /** Ledger with a running balance in date order (robust to back-dated entries). */
    public function ledger(Supplier $supplier): array
    {
        $transactions = SupplierTransaction::with('purchase:id,product_id,quantity,invoice_no', 'purchase.product:id,name,name_mr')
            ->where('supplier_id', $supplier->id)
            ->orderBy('transaction_date')
            ->orderBy('id')
            ->get();

        $running = '0';
        $entries = $transactions->map(function (SupplierTransaction $tx) use (&$running) {
            $running = Money::round(Money::sub(Money::add($running, $tx->debit), $tx->credit), 2);

            return [
                'id' => $tx->id,
                'date' => $tx->transaction_date->toIso8601String(),
                'type' => $tx->type,
                'purchase_id' => $tx->purchase_id,
                'product' => $tx->purchase?->product ? [
                    'name' => $tx->purchase->product->name,
                    'name_mr' => $tx->purchase->product->name_mr,
                ] : null,
                'quantity' => $tx->purchase?->quantity,
                'invoice_no' => $tx->purchase?->invoice_no,
                'payment_method' => $tx->payment_method,
                'notes' => $tx->notes,
                'debit' => $tx->debit,
                'credit' => $tx->credit,
                'balance' => $running,
            ];
        });

        return [
            'entries' => $entries->reverse()->values(), // newest first
            'closing_balance' => $running,
        ];
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerTransaction extends Model
{
    public const PAYMENT_METHODS = ['cash', 'upi', 'card', 'bank', 'other'];

    protected $fillable = [
        'customer_id', 'type', 'debit', 'credit', 'balance_after', 'sale_id',
        'payment_method', 'transaction_date', 'notes', 'user_id',
    ];

    protected function casts(): array
    {
        return [
            'debit' => 'decimal:2',
            'credit' => 'decimal:2',
            'balance_after' => 'decimal:2',
            'transaction_date' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }
}

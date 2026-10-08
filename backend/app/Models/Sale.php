<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    public const METHODS = ['cash', 'udhari', 'other'];

    protected $fillable = [
        'invoice_no', 'customer_id', 'payment_method', 'total_qty', 'total_amount', 'total_cost',
        'profit', 'status', 'sold_at', 'notes', 'voided_at', 'void_reason', 'user_id',
    ];

    protected function casts(): array
    {
        return [
            'total_qty' => 'integer',
            'total_amount' => 'decimal:2',
            'total_cost' => 'decimal:2',
            'profit' => 'decimal:2',
            'sold_at' => 'datetime',
            'voided_at' => 'datetime',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function scopeCompleted(Builder $query): Builder
    {
        return $query->where('sales.status', 'completed');
    }
}

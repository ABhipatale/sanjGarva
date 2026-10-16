<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Expense extends Model
{
    protected $fillable = ['expense_category_id', 'amount', 'expense_date', 'description', 'payment_method', 'user_id'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'expense_date' => 'date:Y-m-d'];
    }

    /** Only expenses whose category is of the given kind (bar | home). */
    public function scopeOfKind(Builder $query, string $kind): Builder
    {
        return $query->whereIn('expenses.expense_category_id', ExpenseCategory::query()->select('id')->where('kind', $kind));
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'expense_category_id');
    }
}

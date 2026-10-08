<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Customer extends Model
{
    protected $fillable = ['name', 'mobile', 'address', 'opening_balance', 'balance', 'notes'];

    protected function casts(): array
    {
        return [
            'opening_balance' => 'decimal:2',
            'balance' => 'decimal:2',
        ];
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(CustomerTransaction::class);
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        $term = trim((string) $term);
        if ($term === '') {
            return $query;
        }
        $op = DB::getDriverName() === 'pgsql' ? 'ILIKE' : 'LIKE';
        $like = '%'.addcslashes($term, '%_\\').'%';

        return $query->where(fn (Builder $q) => $q->where('name', $op, $like)->orWhere('mobile', 'LIKE', $like));
    }

    /** Adds total_debit (udhari given) / total_credit (paid) aggregates. */
    public function scopeWithTotals(Builder $query): Builder
    {
        return $query->withSum('transactions as total_debit', 'debit')
            ->withSum('transactions as total_credit', 'credit');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExpenseCategory extends Model
{
    /** bar: business expense, deducted in P&L. home: household spending, shown only in Expenses → Home. */
    public const KINDS = ['bar', 'home'];

    public const HOME_DEFAULTS = [
        ['Grocery', 'किराणा'], ['Household', 'घरखर्च'], ['Medical', 'दवाखाना / औषध'],
        ['Education', 'शिक्षण'], ['Travel', 'प्रवास'], ['Home Other', 'घरचे इतर'],
    ];

    protected $fillable = ['name', 'name_mr', 'kind', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }
}

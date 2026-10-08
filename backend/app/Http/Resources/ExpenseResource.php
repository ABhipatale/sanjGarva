<?php

namespace App\Http\Resources;

use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Expense */
class ExpenseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'expense_category_id' => $this->expense_category_id,
            'category' => $this->whenLoaded('category', fn () => [
                'id' => $this->category->id,
                'name' => $this->category->name,
                'name_mr' => $this->category->name_mr,
            ]),
            'amount' => $this->amount,
            'expense_date' => $this->expense_date?->toDateString(),
            'description' => $this->description,
            'payment_method' => $this->payment_method,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

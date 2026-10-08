<?php

namespace App\Http\Requests;

use App\Models\CustomerTransaction;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'expense_category_id' => ['required', 'integer', 'exists:expense_categories,id'],
            'amount' => ['required', 'numeric', 'gt:0', 'max:9999999999'],
            'expense_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'description' => ['nullable', 'string', 'max:255'],
            'payment_method' => ['nullable', Rule::in(CustomerTransaction::PAYMENT_METHODS)],
        ];
    }
}

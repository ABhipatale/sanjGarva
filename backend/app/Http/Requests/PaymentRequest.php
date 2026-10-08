<?php

namespace App\Http\Requests;

use App\Models\CustomerTransaction;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'gt:0', 'max:9999999999'],
            'payment_date' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
            'payment_method' => ['required', Rule::in(CustomerTransaction::PAYMENT_METHODS)],
            'notes' => ['nullable', 'string', 'max:255'],
        ];
    }
}

<?php

namespace App\Http\Requests;

use App\Models\CustomerTransaction;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** One supplier bill with several products. */
class AddStockBillRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
            'items.*.cost_price' => ['required', 'numeric', 'min:0', 'max:9999999999'],
            'items.*.selling_price' => ['nullable', 'numeric', 'min:0', 'max:9999999999'],
            'supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'paid_amount' => ['nullable', 'numeric', 'min:0', 'max:9999999999'],
            'payment_method' => ['nullable', Rule::in(CustomerTransaction::PAYMENT_METHODS)],
            'invoice_no' => ['nullable', 'string', 'max:60'],
            'purchase_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}

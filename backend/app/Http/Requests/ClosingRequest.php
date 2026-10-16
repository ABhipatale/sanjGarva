<?php

namespace App\Http\Requests;

use App\Models\StockTransaction;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ClosingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'location' => ['required', Rule::in(StockTransaction::LOCATIONS)],
            'payment_method' => ['required', Rule::in(['cash', 'other'])],
            'counts' => ['required', 'array', 'min:1', 'max:500'],
            'counts.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'counts.*.remaining' => ['required', 'integer', 'min:0', 'max:1000000'],
        ];
    }
}

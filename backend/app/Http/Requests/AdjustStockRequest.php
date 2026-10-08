<?php

namespace App\Http\Requests;

use App\Models\StockAdjustment;
use App\Models\StockTransaction;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdjustStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'location' => ['required', Rule::in(StockTransaction::LOCATIONS)],
            'actual_quantity' => ['required', 'integer', 'min:0', 'max:1000000'],
            'reason' => ['required', Rule::in(StockAdjustment::REASONS)],
            'notes' => ['nullable', 'string', 'max:255'],
        ];
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'bar_name' => ['sometimes', 'required', 'string', 'max:150'],
            'bar_name_mr' => ['sometimes', 'nullable', 'string', 'max:150'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'gstin' => ['sometimes', 'nullable', 'string', 'max:50'],
            'currency' => ['sometimes', 'required', 'string', 'max:5'],
            'low_stock_default' => ['sometimes', 'required', 'integer', 'min:0', 'max:100000'],
        ];
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'mobile' => ['nullable', 'string', 'regex:/^[0-9+\-\s]{6,15}$/'],
            'address' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'opening_balance' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999'],
        ];
    }
}

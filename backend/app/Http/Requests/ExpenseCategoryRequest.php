<?php

namespace App\Http\Requests;

use App\Models\ExpenseCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ExpenseCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'name_mr' => ['nullable', 'string', 'max:100'],
            'kind' => ['sometimes', Rule::in(ExpenseCategory::KINDS)],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}

<?php

namespace App\Http\Resources;

use App\Models\Customer;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Customer */
class CustomerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $hasTotals = array_key_exists('total_debit', $this->getAttributes());

        return [
            'id' => $this->id,
            'name' => $this->name,
            'mobile' => $this->mobile,
            'address' => $this->address,
            'notes' => $this->notes,
            'opening_balance' => $this->opening_balance,
            'balance' => $this->balance,
            $this->mergeWhen($hasTotals, fn () => [
                'total_debit' => Money::round($this->total_debit, 2),
                'total_credit' => Money::round($this->total_credit, 2),
            ]),
            'last_transaction_at' => $this->when(
                array_key_exists('last_transaction_at', $this->getAttributes()),
                fn () => $this->last_transaction_at,
            ),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

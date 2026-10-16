<?php

namespace App\Http\Resources;

use App\Models\Supplier;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Supplier */
class SupplierResource extends JsonResource
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
            'balance' => $this->balance, // unpaid
            $this->mergeWhen($hasTotals, fn () => [
                'total_purchase' => Money::round($this->total_debit, 2),
                'total_paid' => Money::round($this->total_credit, 2),
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

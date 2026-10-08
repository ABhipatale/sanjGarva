<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockTransaction extends Model
{
    public const LOCATIONS = ['store', 'shop'];

    public const TYPES = ['opening', 'purchase', 'transfer_out', 'transfer_in', 'sale', 'sale_void', 'adjustment'];

    protected $fillable = [
        'product_id', 'location', 'type', 'quantity', 'balance_after', 'unit_cost',
        'reference_type', 'reference_id', 'notes', 'user_id',
    ];

    protected function casts(): array
    {
        return ['quantity' => 'integer', 'balance_after' => 'integer', 'unit_cost' => 'decimal:4'];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}

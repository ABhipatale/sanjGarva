<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockAdjustment extends Model
{
    public const REASONS = ['damaged', 'broken', 'missing', 'expired', 'correction', 'found'];

    protected $fillable = ['product_id', 'location', 'previous_qty', 'new_qty', 'difference', 'reason', 'notes', 'user_id'];

    protected function casts(): array
    {
        return ['previous_qty' => 'integer', 'new_qty' => 'integer', 'difference' => 'integer'];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}

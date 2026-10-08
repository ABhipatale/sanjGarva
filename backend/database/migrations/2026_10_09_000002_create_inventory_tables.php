<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Inventory: current balances per location, purchases, transfers, adjustments and the stock ledger.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['store_stock', 'shop_stock'] as $name) {
            Schema::create($name, function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_id')->unique()->constrained()->cascadeOnDelete();
                $table->integer('quantity')->default(0);
                $table->timestamps();

                $table->index('quantity');
            });
        }

        Schema::create('purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->decimal('unit_cost', 12, 2);
            $table->decimal('total_cost', 14, 2);
            $table->decimal('selling_price', 12, 2)->nullable();
            $table->string('supplier', 150)->nullable();
            $table->string('invoice_no', 60)->nullable();
            $table->date('purchase_date');
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->index(['purchase_date', 'id']);
            $table->index('product_id');
        });

        Schema::create('stock_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->string('from_location', 10)->default('store');
            $table->string('to_location', 10)->default('shop');
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->index(['created_at', 'id']);
            $table->index('product_id');
        });

        Schema::create('stock_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->string('location', 10); // store | shop
            $table->integer('previous_qty');
            $table->integer('new_qty');
            $table->integer('difference');
            $table->string('reason', 30);
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->index(['created_at', 'id']);
            $table->index('product_id');
        });

        // Append-only ledger: one row per location affected by any stock movement.
        Schema::create('stock_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->string('location', 10); // store | shop
            $table->string('type', 20);     // opening | purchase | transfer_out | transfer_in | sale | sale_void | adjustment
            $table->integer('quantity');    // signed: + in, - out
            $table->integer('balance_after');
            $table->decimal('unit_cost', 12, 4)->nullable();
            $table->string('reference_type', 30)->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('notes', 255)->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->index(['product_id', 'created_at']);
            $table->index(['location', 'created_at']);
            $table->index(['type', 'created_at']);
            $table->index(['reference_type', 'reference_id']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE store_stock ADD CONSTRAINT store_stock_qty_non_negative CHECK (quantity >= 0)');
            DB::statement('ALTER TABLE shop_stock ADD CONSTRAINT shop_stock_qty_non_negative CHECK (quantity >= 0)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_transactions');
        Schema::dropIfExists('stock_adjustments');
        Schema::dropIfExists('stock_transfers');
        Schema::dropIfExists('purchases');
        Schema::dropIfExists('shop_stock');
        Schema::dropIfExists('store_stock');
    }
};

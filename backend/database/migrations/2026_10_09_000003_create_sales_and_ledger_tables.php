<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Sales, customer udhari ledger and expenses.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_no', 30)->nullable()->unique(); // set right after insert from the id
            $table->foreignId('customer_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('payment_method', 10); // cash | udhari | other
            $table->unsignedInteger('total_qty');
            $table->decimal('total_amount', 12, 2);
            $table->decimal('total_cost', 12, 2);
            $table->decimal('profit', 12, 2);
            $table->string('status', 12)->default('completed'); // completed | void
            $table->timestamp('sold_at');
            $table->text('notes')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->string('void_reason', 255)->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'sold_at']);
            $table->index(['sold_at', 'id']);
            $table->index('customer_id');
            $table->index('payment_method');
        });

        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->string('product_name', 150); // snapshot for receipts/history
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 12, 2);
            // Weighted average cost at the moment of sale: historical COGS never changes later.
            $table->decimal('unit_cost', 12, 4);
            $table->decimal('line_total', 12, 2);
            $table->decimal('line_cost', 12, 2);
            $table->decimal('line_profit', 12, 2);
            $table->timestamps();

            $table->index('sale_id');
            $table->index('product_id');
        });

        Schema::create('customer_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20); // opening | sale | payment | sale_void
            $table->decimal('debit', 12, 2)->default(0);   // increases outstanding
            $table->decimal('credit', 12, 2)->default(0);  // decreases outstanding
            $table->decimal('balance_after', 12, 2);
            $table->foreignId('sale_id')->nullable()->constrained()->nullOnDelete();
            $table->string('payment_method', 20)->nullable();
            $table->timestamp('transaction_date');
            $table->string('notes', 255)->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->index(['customer_id', 'transaction_date', 'id']);
            $table->index(['type', 'transaction_date']);
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('expense_category_id')->constrained()->restrictOnDelete();
            $table->decimal('amount', 12, 2);
            $table->date('expense_date');
            $table->string('description', 255)->nullable();
            $table->string('payment_method', 20)->default('cash');
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->index(['expense_date', 'id']);
            $table->index('expense_category_id');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE sales ADD CONSTRAINT sales_udhari_needs_customer CHECK (payment_method <> 'udhari' OR customer_id IS NOT NULL)");
            DB::statement('ALTER TABLE sale_items ADD CONSTRAINT sale_items_qty_positive CHECK (quantity > 0)');
            DB::statement('ALTER TABLE expenses ADD CONSTRAINT expenses_amount_positive CHECK (amount > 0)');
            DB::statement('ALTER TABLE customer_transactions ADD CONSTRAINT customer_tx_amounts_non_negative CHECK (debit >= 0 AND credit >= 0)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('customer_transactions');
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('sales');
    }
};

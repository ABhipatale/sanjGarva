<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Suppliers and their khata: purchases add to what the bar owes (debit), payments reduce it (credit).
 * suppliers.balance is the cached unpaid amount, kept in sync inside DB transactions.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('mobile', 15)->nullable();
            $table->string('address', 255)->nullable();
            $table->decimal('opening_balance', 12, 2)->default(0);
            $table->decimal('balance', 12, 2)->default(0); // unpaid
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('name');
            $table->index('balance');
        });

        Schema::create('supplier_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20); // opening | purchase | payment
            $table->decimal('debit', 12, 2)->default(0);  // bought: increases unpaid
            $table->decimal('credit', 12, 2)->default(0); // paid: decreases unpaid
            $table->decimal('balance_after', 12, 2);
            $table->foreignId('purchase_id')->nullable()->constrained()->nullOnDelete();
            $table->string('payment_method', 20)->nullable();
            $table->timestamp('transaction_date');
            $table->string('notes', 255)->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->index(['supplier_id', 'transaction_date', 'id']);
        });

        Schema::table('purchases', function (Blueprint $table) {
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('paid_amount', 14, 2)->default(0);
            $table->index('supplier_id');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE supplier_transactions ADD CONSTRAINT supplier_tx_amounts_non_negative CHECK (debit >= 0 AND credit >= 0)');
        }
    }

    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
            $table->dropIndex(['supplier_id']);
            $table->dropColumn(['supplier_id', 'paid_amount']);
        });
        Schema::dropIfExists('supplier_transactions');
        Schema::dropIfExists('suppliers');
    }
};

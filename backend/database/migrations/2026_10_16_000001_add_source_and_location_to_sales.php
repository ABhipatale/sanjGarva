<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Day-end closing: a sale can now come from the POS or from a closing count, and can be
 * taken from either location. Cancelling a bill returns stock to the location it came from.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->string('source', 10)->default('pos');          // pos | closing
            $table->string('stock_location', 10)->default('shop'); // store | shop
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn(['source', 'stock_location']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Master data: settings, product categories, products, expense categories, customers.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key', 64)->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('name_mr', 100)->nullable();
            $table->foreignId('parent_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['parent_id', 'sort_order']);
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('name_mr', 150)->nullable();
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->foreignId('sub_category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('brand', 100)->nullable();
            $table->string('unit', 20)->default('bottle');
            $table->string('bottle_size', 30)->nullable();
            $table->unsignedInteger('min_stock')->default(5);
            // Latest purchase cost (shown to the user) and weighted average cost (used for COGS).
            $table->decimal('cost_price', 12, 2)->default(0);
            $table->decimal('avg_cost', 12, 4)->default(0);
            $table->decimal('selling_price', 12, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('name');
            $table->index('brand');
            $table->index('category_id');
            $table->index('is_active');
        });

        Schema::create('expense_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('name_mr', 100)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('mobile', 15)->nullable();
            $table->string('address', 255)->nullable();
            $table->decimal('opening_balance', 12, 2)->default(0);
            // Running outstanding balance, kept in sync with customer_transactions inside DB transactions.
            $table->decimal('balance', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('name');
            $table->index('mobile');
            $table->index('balance');
        });

        if (DB::getDriverName() === 'pgsql') {
            // Trigram indexes make ILIKE '%term%' search fast on large tables.
            DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
            DB::statement('CREATE INDEX products_name_trgm ON products USING gin (name gin_trgm_ops)');
            DB::statement('CREATE INDEX products_brand_trgm ON products USING gin (brand gin_trgm_ops)');
            DB::statement('CREATE INDEX customers_name_trgm ON customers USING gin (name gin_trgm_ops)');
            DB::statement('ALTER TABLE products ADD CONSTRAINT products_prices_non_negative CHECK (cost_price >= 0 AND selling_price >= 0 AND avg_cost >= 0)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
        Schema::dropIfExists('expense_categories');
        Schema::dropIfExists('products');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('settings');
    }
};

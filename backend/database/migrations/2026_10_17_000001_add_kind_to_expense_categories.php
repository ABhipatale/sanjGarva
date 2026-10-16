<?php

use App\Models\ExpenseCategory;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Home (household) expenses: kept in their own categories and never deducted from the bar's
 * profit & loss. Existing categories stay bar expenses. Home categories are added here (not only
 * in the seeder) so databases that are already in use get them on the next migrate.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expense_categories', function (Blueprint $table) {
            $table->string('kind', 10)->default('bar'); // bar | home
            $table->index('kind');
        });

        $sort = (int) DB::table('expense_categories')->max('sort_order');
        foreach (ExpenseCategory::HOME_DEFAULTS as [$name, $mr]) {
            if (! DB::table('expense_categories')->where('kind', 'home')->where('name', $name)->exists()) {
                DB::table('expense_categories')->insert([
                    'name' => $name, 'name_mr' => $mr, 'kind' => 'home', 'sort_order' => ++$sort,
                    'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        $home = DB::table('expense_categories')->where('kind', 'home')->pluck('id');
        if (! DB::table('expenses')->whereIn('expense_category_id', $home)->exists()) {
            DB::table('expense_categories')->whereIn('id', $home)->delete();
        }

        Schema::table('expense_categories', function (Blueprint $table) {
            $table->dropIndex(['kind']);
            $table->dropColumn('kind');
        });
    }
};

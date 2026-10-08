<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Customer;
use App\Models\ExpenseCategory;
use App\Models\Expense;
use App\Models\Product;
use App\Models\User;
use App\Services\CustomerLedgerService;
use App\Services\SaleService;
use App\Services\StockService;
use App\Support\Money;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Sample data for demos/testing: php artisan db:seed --class=DemoSeeder
 * Do NOT run on the live database.
 */
class DemoSeeder extends Seeder
{
    public function run(StockService $stock, SaleService $sales, CustomerLedgerService $ledger): void
    {
        $this->call(DatabaseSeeder::class);
        $userId = User::value('id');
        $cat = fn (string $name) => Category::where('name', $name)->value('id');

        $products = [
            // name, marathi, category, brand, unit, size, cost, sell, store, shop, min
            ['Kingfisher Premium', 'किंगफिशर प्रीमियम', 'Beer', 'Kingfisher', 'bottle', '650 ml', 100, 150, 100, 20, 10],
            ['Kingfisher Strong', 'किंगफिशर स्ट्रॉंग', 'Beer', 'Kingfisher', 'bottle', '650 ml', 110, 160, 80, 15, 10],
            ['Tuborg Strong', 'टुबॉर्ग स्ट्रॉंग', 'Beer', 'Tuborg', 'can', '500 ml', 95, 140, 48, 12, 8],
            ['Old Monk', 'ओल्ड मंक', 'Rum', 'Old Monk', 'bottle', '750 ml', 350, 480, 50, 8, 5],
            ['Blenders Pride', 'ब्लेंडर्स प्राईड', 'Whisky', 'Pernod Ricard', 'bottle', '750 ml', 900, 1200, 30, 4, 5],
            ['Royal Stag', 'रॉयल स्टॅग', 'Whisky', 'Pernod Ricard', 'bottle', '750 ml', 650, 850, 40, 10, 5],
            ["McDowell's No.1", 'मॅकडॉवेल्स नं.1', 'Whisky', "McDowell's", 'bottle', '750 ml', 600, 780, 36, 6, 5],
            ['Magic Moments', 'मॅजिक मोमेंट्स', 'Vodka', 'Radico', 'bottle', '750 ml', 550, 720, 20, 0, 3],
            ['Sula Red', 'सुला रेड', 'Wine', 'Sula', 'bottle', '750 ml', 700, 950, 12, 2, 3],
            ['Bisleri Soda', 'बिस्लेरी सोडा', 'Water & Soda', 'Bisleri', 'bottle', '600 ml', 15, 30, 120, 40, 20],
        ];

        DB::transaction(function () use ($products, $cat, $stock, $userId) {
            foreach ($products as [$name, $mr, $category, $brand, $unit, $size, $cost, $sell, $store, $shop, $min]) {
                if (Product::where('name', $name)->exists()) {
                    continue;
                }
                $p = Product::create([
                    'name' => $name, 'name_mr' => $mr, 'category_id' => $cat($category), 'brand' => $brand,
                    'unit' => $unit, 'bottle_size' => $size, 'min_stock' => $min,
                    'cost_price' => $cost, 'avg_cost' => Money::round($cost, 4), 'selling_price' => $sell,
                ]);
                $stock->initialize($p, $store, $shop, $userId);
            }
        });

        $customers = [['Ramesh Patil', '9822012345', 500], ['Suresh Jadhav', '9890011223', 0], ['Mahesh Shinde', '9767001122', 1200]];
        foreach ($customers as [$name, $mobile, $opening]) {
            if (! Customer::where('name', $name)->exists()) {
                $ledger->create(['name' => $name, 'mobile' => $mobile, 'opening_balance' => $opening], $userId);
            }
        }

        $kf = Product::where('name', 'Kingfisher Premium')->value('id');
        $om = Product::where('name', 'Old Monk')->value('id');
        $soda = Product::where('name', 'Bisleri Soda')->value('id');
        $ramesh = Customer::where('name', 'Ramesh Patil')->value('id');

        $sales->create(['items' => [['product_id' => $kf, 'quantity' => 2], ['product_id' => $om, 'quantity' => 1]], 'payment_method' => 'cash'], $userId);
        $sales->create(['items' => [['product_id' => $kf, 'quantity' => 3], ['product_id' => $soda, 'quantity' => 2]], 'payment_method' => 'udhari', 'customer_id' => $ramesh], $userId);
        $sales->create(['items' => [['product_id' => $soda, 'quantity' => 4]], 'payment_method' => 'other'], $userId);

        Expense::firstOrCreate(
            ['description' => 'Ice purchase', 'expense_date' => now()->toDateString()],
            ['expense_category_id' => ExpenseCategory::where('name', 'Ice')->value('id'), 'amount' => 200, 'payment_method' => 'cash', 'user_id' => $userId],
        );
    }
}

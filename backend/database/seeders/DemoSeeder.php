<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use App\Services\CustomerLedgerService;
use App\Services\SaleService;
use App\Services\StockService;
use App\Support\Money;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Sample bar data for demos/testing: php artisan db:seed --class=DemoSeeder
 * (or DEMO_DATA=true on Vercel, or scripts/seed-demo.ps1). Safe to run again: existing
 * products and customers are skipped and demo sales are only added to an empty sales list.
 * Do NOT run on a live bar's database.
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
            ['Kingfisher Premium', 'किंगफिशर प्रीमियम', 'Beer', 'Kingfisher', 'bottle', '650 ml', 100, 150, 120, 24, 10],
            ['Kingfisher Strong', 'किंगफिशर स्ट्रॉंग', 'Beer', 'Kingfisher', 'bottle', '650 ml', 110, 160, 96, 20, 10],
            ['Kingfisher Ultra', 'किंगफिशर अल्ट्रा', 'Beer', 'Kingfisher', 'bottle', '650 ml', 130, 190, 48, 6, 8],
            ['Tuborg Strong', 'टुबॉर्ग स्ट्रॉंग', 'Beer', 'Tuborg', 'can', '500 ml', 95, 140, 72, 12, 8],
            ['Tuborg Green', 'टुबॉर्ग ग्रीन', 'Beer', 'Tuborg', 'bottle', '650 ml', 105, 155, 60, 12, 8],
            ['Budweiser', 'बडवायझर', 'Beer', 'AB InBev', 'bottle', '650 ml', 140, 200, 60, 10, 8],
            ['Budweiser Magnum', 'बडवायझर मॅग्नम', 'Beer', 'AB InBev', 'bottle', '650 ml', 150, 210, 36, 4, 6],
            ['Carlsberg Elephant', 'कार्ल्सबर्ग एलिफंट', 'Beer', 'Carlsberg', 'bottle', '650 ml', 135, 190, 48, 8, 6],
            ['Heineken', 'हायनेकेन', 'Beer', 'Heineken', 'bottle', '650 ml', 145, 210, 24, 0, 6],
            ['Bira 91 White', 'बीरा 91 व्हाईट', 'Beer', 'Bira 91', 'can', '330 ml', 90, 140, 48, 12, 8],
            ["Hayward's 5000", 'हेवर्ड्स 5000', 'Beer', "Hayward's", 'bottle', '650 ml', 95, 145, 72, 18, 10],
            ['Corona Extra', 'कोरोना एक्स्ट्रा', 'Beer', 'AB InBev', 'bottle', '330 ml', 180, 260, 24, 3, 6],

            ['Blenders Pride', 'ब्लेंडर्स प्राईड', 'Whisky', 'Pernod Ricard', 'bottle', '750 ml', 900, 1200, 30, 4, 5],
            ['Royal Stag', 'रॉयल स्टॅग', 'Whisky', 'Pernod Ricard', 'bottle', '750 ml', 650, 850, 40, 10, 5],
            ["McDowell's No.1", 'मॅकडॉवेल्स नं.1', 'Whisky', "McDowell's", 'bottle', '750 ml', 600, 780, 36, 6, 5],
            ['Imperial Blue', 'इम्पीरियल ब्लू', 'Whisky', 'Pernod Ricard', 'bottle', '750 ml', 560, 740, 36, 8, 5],
            ["Officer's Choice", 'ऑफिसर्स चॉईस', 'Whisky', 'Allied Blenders', 'bottle', '750 ml', 450, 600, 48, 12, 6],
            ['Signature', 'सिग्नेचर', 'Whisky', 'Diageo', 'bottle', '750 ml', 1000, 1350, 18, 3, 3],
            ['Antiquity Blue', 'अँटिक्विटी ब्लू', 'Whisky', 'Diageo', 'bottle', '750 ml', 1100, 1450, 12, 2, 3],
            ['100 Pipers', '100 पायपर्स', 'Whisky', 'Pernod Ricard', 'bottle', '750 ml', 1500, 1950, 12, 2, 2],
            ["Teacher's Highland Cream", 'टीचर्स हायलँड क्रीम', 'Whisky', 'Beam Suntory', 'bottle', '750 ml', 1700, 2200, 6, 1, 2],

            ['Old Monk', 'ओल्ड मंक', 'Rum', 'Mohan Meakin', 'bottle', '750 ml', 350, 480, 50, 8, 5],
            ['Bacardi White', 'बकार्डी व्हाईट', 'Rum', 'Bacardi', 'bottle', '750 ml', 800, 1050, 18, 3, 3],
            ["McDowell's No.1 Celebration", 'मॅकडॉवेल्स सेलिब्रेशन रम', 'Rum', "McDowell's", 'bottle', '750 ml', 400, 550, 30, 6, 4],

            ['Magic Moments', 'मॅजिक मोमेंट्स', 'Vodka', 'Radico', 'bottle', '750 ml', 550, 720, 20, 0, 3],
            ['Smirnoff', 'स्मरनॉफ', 'Vodka', 'Diageo', 'bottle', '750 ml', 750, 980, 18, 4, 3],
            ['Romanov', 'रोमानोव्ह', 'Vodka', 'Diageo', 'bottle', '750 ml', 420, 560, 24, 6, 4],

            ['Honey Bee', 'हनी बी', 'Brandy', 'Mohan Meakin', 'bottle', '750 ml', 420, 560, 30, 6, 4],
            ['Mansion House', 'मॅन्शन हाऊस', 'Brandy', 'Tilaknagar', 'bottle', '750 ml', 500, 660, 24, 2, 4],

            ['Blue Riband', 'ब्लू रिबँड', 'Gin', 'Diageo', 'bottle', '750 ml', 500, 650, 12, 3, 2],
            ['Greater Than', 'ग्रेटर दॅन', 'Gin', 'Nao Spirits', 'bottle', '750 ml', 1400, 1800, 6, 1, 2],

            ['Sula Red', 'सुला रेड', 'Wine', 'Sula', 'bottle', '750 ml', 700, 950, 12, 2, 3],
            ['Sula Chenin Blanc', 'सुला शेनिन ब्लांक', 'Wine', 'Sula', 'bottle', '750 ml', 750, 990, 12, 2, 3],

            ['Coca-Cola', 'कोका-कोला', 'Soft Drinks', 'Coca-Cola', 'bottle', '750 ml', 30, 50, 96, 24, 12],
            ['Thums Up', 'थम्स अप', 'Soft Drinks', 'Coca-Cola', 'bottle', '750 ml', 30, 50, 96, 24, 12],
            ['Bisleri Soda', 'बिस्लेरी सोडा', 'Water & Soda', 'Bisleri', 'bottle', '600 ml', 15, 30, 120, 40, 20],
            ['Bisleri Water', 'बिस्लेरी पाणी', 'Water & Soda', 'Bisleri', 'bottle', '1 L', 12, 20, 120, 36, 20],

            ['Masala Peanuts', 'मसाला शेंगदाणे', 'Snacks', 'House', 'piece', '100 g', 20, 40, 80, 20, 10],
            ["Lay's Classic", 'लेज क्लासिक', 'Snacks', "Lay's", 'piece', '52 g', 18, 30, 60, 15, 10],
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

        $customers = [
            ['Ramesh Patil', '9822012345', 500], ['Suresh Jadhav', '9890011223', 0],
            ['Mahesh Shinde', '9767001122', 1200], ['Ganesh Pawar', '9921045678', 300],
        ];
        foreach ($customers as [$name, $mobile, $opening]) {
            if (! Customer::where('name', $name)->exists()) {
                $ledger->create(['name' => $name, 'mobile' => $mobile, 'opening_balance' => $opening], $userId);
            }
        }

        if (! Sale::query()->exists()) {
            $id = fn (string $name) => Product::where('name', $name)->value('id');
            $customer = fn (string $name) => Customer::where('name', $name)->value('id');
            $demoSales = [
                [[['Kingfisher Premium', 2], ['Old Monk', 1]], 'cash', null],
                [[['Kingfisher Strong', 3], ['Bisleri Soda', 2]], 'udhari', 'Ramesh Patil'],
                [[['Bisleri Soda', 4], ['Masala Peanuts', 2]], 'other', null],
                [[['Royal Stag', 1], ['Thums Up', 2], ['Masala Peanuts', 1]], 'cash', null],
                [[['Budweiser', 4], ["Lay's Classic", 2]], 'cash', null],
                [[['Blenders Pride', 1], ['Bisleri Water', 2]], 'udhari', 'Mahesh Shinde'],
                [[['Tuborg Strong', 6]], 'cash', null],
                [[['Smirnoff', 1], ['Coca-Cola', 2]], 'other', null],
            ];
            foreach ($demoSales as [$items, $method, $customerName]) {
                $lines = array_map(fn ($i) => ['product_id' => $id($i[0]), 'quantity' => $i[1]], $items);
                $sales->create(array_filter([
                    'items' => $lines,
                    'payment_method' => $method,
                    'customer_id' => $customerName ? $customer($customerName) : null,
                ]), $userId);
            }
        }

        $expenses = [['Ice purchase', 'Ice', 200], ['Electricity bill', 'Electricity', 3500], ['Staff tea & snacks', 'Food', 150]];
        foreach ($expenses as [$description, $category, $amount]) {
            Expense::firstOrCreate(
                ['description' => $description, 'expense_date' => now()->toDateString()],
                ['expense_category_id' => ExpenseCategory::where('name', $category)->value('id'), 'amount' => $amount, 'payment_method' => 'cash', 'user_id' => $userId],
            );
        }
    }
}

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
        Category::firstOrCreate(['name' => 'Country Liquor', 'parent_id' => null], ['name_mr' => 'देशी दारू', 'sort_order' => 11]);
        $cat = fn (string $name) => Category::where('name', $name)->value('id');

        // A village bar: mostly quarters (180 ml) and nips (90 ml), strong beer and country liquor.
        $products = [
            // name, marathi, category, brand, unit, size, cost, sell, store, shop, min
            ['GM Santra', 'जीएम संत्रा', 'Country Liquor', 'GM Breweries', 'bottle', '180 ml', 60, 80, 240, 48, 24],
            ['GM Santra Nip', 'जीएम संत्रा नीप', 'Country Liquor', 'GM Breweries', 'bottle', '90 ml', 32, 45, 192, 36, 24],
            ['GM Limbu Punch', 'जीएम लिंबू पंच', 'Country Liquor', 'GM Breweries', 'bottle', '180 ml', 60, 80, 144, 30, 24],
            ['GM Doctor', 'जीएम डॉक्टर', 'Country Liquor', 'GM Breweries', 'bottle', '180 ml', 65, 85, 96, 12, 18],

            ['Kingfisher Strong', 'किंगफिशर स्ट्रॉंग', 'Beer', 'Kingfisher', 'bottle', '650 ml', 110, 160, 96, 24, 12],
            ['Kingfisher Strong Pint', 'किंगफिशर स्ट्रॉंग पिंट', 'Beer', 'Kingfisher', 'bottle', '330 ml', 65, 95, 72, 18, 12],
            ['Kingfisher Premium', 'किंगफिशर प्रीमियम', 'Beer', 'Kingfisher', 'bottle', '650 ml', 100, 150, 48, 12, 8],
            ["Hayward's 5000", 'हेवर्ड्स 5000', 'Beer', "Hayward's", 'bottle', '650 ml', 95, 145, 96, 24, 12],
            ['Knock Out', 'नॉक आऊट', 'Beer', 'SABMiller', 'bottle', '650 ml', 100, 150, 72, 4, 12],
            ['Tuborg Strong', 'टुबॉर्ग स्ट्रॉंग', 'Beer', 'Tuborg', 'can', '500 ml', 95, 140, 48, 12, 8],
            ['Budweiser Magnum', 'बडवायझर मॅग्नम', 'Beer', 'AB InBev', 'bottle', '650 ml', 150, 210, 24, 6, 6],

            ["Officer's Choice Quarter", 'ऑफिसर्स चॉईस क्वार्टर', 'Whisky', 'Allied Blenders', 'bottle', '180 ml', 120, 160, 144, 30, 24],
            ["Officer's Choice Nip", 'ऑफिसर्स चॉईस नीप', 'Whisky', 'Allied Blenders', 'bottle', '90 ml', 62, 85, 96, 24, 18],
            ["McDowell's No.1 Quarter", 'मॅकडॉवेल्स नं.1 क्वार्टर', 'Whisky', "McDowell's", 'bottle', '180 ml', 150, 200, 96, 18, 18],
            ['Imperial Blue Quarter', 'इम्पीरियल ब्लू क्वार्टर', 'Whisky', 'Pernod Ricard', 'bottle', '180 ml', 145, 190, 72, 12, 12],
            ['Royal Stag Quarter', 'रॉयल स्टॅग क्वार्टर', 'Whisky', 'Pernod Ricard', 'bottle', '180 ml', 170, 220, 72, 6, 12],
            ['Royal Stag', 'रॉयल स्टॅग', 'Whisky', 'Pernod Ricard', 'bottle', '750 ml', 650, 850, 12, 3, 3],
            ['8PM Whisky Quarter', '8 पीएम व्हिस्की क्वार्टर', 'Whisky', 'Radico Khaitan', 'bottle', '180 ml', 115, 155, 72, 12, 12],
            ['Bagpiper Quarter', 'बॅगपायपर क्वार्टर', 'Whisky', 'United Spirits', 'bottle', '180 ml', 115, 155, 48, 0, 12],
            ['Blenders Pride Quarter', 'ब्लेंडर्स प्राईड क्वार्टर', 'Whisky', 'Pernod Ricard', 'bottle', '180 ml', 230, 300, 24, 4, 6],

            ['Old Monk Quarter', 'ओल्ड मंक क्वार्टर', 'Rum', 'Mohan Meakin', 'bottle', '180 ml', 95, 130, 96, 24, 18],
            ['Old Monk', 'ओल्ड मंक', 'Rum', 'Mohan Meakin', 'bottle', '750 ml', 350, 480, 12, 3, 3],
            ["McDowell's No.1 Celebration Quarter", 'मॅकडॉवेल्स सेलिब्रेशन रम क्वार्टर', 'Rum', "McDowell's", 'bottle', '180 ml', 105, 140, 48, 12, 12],

            ['Honey Bee Quarter', 'हनी बी क्वार्टर', 'Brandy', 'Mohan Meakin', 'bottle', '180 ml', 110, 150, 72, 18, 12],
            ['Mansion House Quarter', 'मॅन्शन हाऊस क्वार्टर', 'Brandy', 'Tilaknagar', 'bottle', '180 ml', 125, 165, 48, 10, 12],

            ['Romanov Quarter', 'रोमानोव्ह क्वार्टर', 'Vodka', 'United Spirits', 'bottle', '180 ml', 110, 150, 48, 12, 12],
            ['Magic Moments Quarter', 'मॅजिक मोमेंट्स क्वार्टर', 'Vodka', 'Radico Khaitan', 'bottle', '180 ml', 140, 185, 24, 3, 6],

            ['Thums Up', 'थम्स अप', 'Soft Drinks', 'Coca-Cola', 'bottle', '250 ml', 15, 20, 96, 24, 12],
            ['Sprite', 'स्प्राईट', 'Soft Drinks', 'Coca-Cola', 'bottle', '250 ml', 15, 20, 72, 24, 12],
            ['Soda', 'सोडा', 'Water & Soda', 'Local', 'bottle', '600 ml', 10, 20, 144, 48, 24],
            ['Water Bottle', 'पाण्याची बाटली', 'Water & Soda', 'Bisleri', 'bottle', '1 L', 12, 20, 96, 24, 12],
            ['Water Pouch', 'पाणी पाऊच', 'Water & Soda', 'Local', 'piece', '250 ml', 2, 5, 400, 100, 50],

            ['Masala Peanuts', 'मसाला शेंगदाणे', 'Snacks', 'House', 'piece', '100 g', 20, 40, 80, 20, 10],
            ['Farsan', 'फरसाण', 'Snacks', 'Local', 'piece', '100 g', 15, 30, 60, 15, 10],
            ['Chana Chakna', 'चणा चकणा', 'Snacks', 'House', 'piece', '100 g', 15, 30, 60, 15, 10],
            ['Boiled Egg', 'उकडलेले अंडे', 'Snacks', 'House', 'piece', '1 pc', 7, 15, 60, 30, 12],
            ['Masala Papad', 'मसाला पापड', 'Snacks', 'House', 'piece', '1 pc', 10, 30, 50, 20, 10],
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
                [[['GM Santra', 2], ['Water Pouch', 2], ['Chana Chakna', 1]], 'cash', null],
                [[["Officer's Choice Quarter", 1], ['Soda', 1], ['Masala Peanuts', 1]], 'cash', null],
                [[['Kingfisher Strong', 2], ['Boiled Egg', 2]], 'udhari', 'Ramesh Patil'],
                [[['Old Monk Quarter', 1], ['Thums Up', 1]], 'other', null],
                [[["Hayward's 5000", 3], ['Farsan', 1]], 'cash', null],
                [[["McDowell's No.1 Quarter", 1], ['Soda', 2], ['Masala Papad', 1]], 'udhari', 'Mahesh Shinde'],
                [[['GM Limbu Punch', 3], ['GM Santra Nip', 2]], 'cash', null],
                [[['Honey Bee Quarter', 1], ['Sprite', 1], ['Boiled Egg', 1]], 'cash', null],
                [[['Royal Stag Quarter', 1], ['Water Bottle', 1]], 'udhari', 'Ganesh Pawar'],
                [[['Kingfisher Strong Pint', 4]], 'other', null],
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

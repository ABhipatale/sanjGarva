<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\ExpenseCategory;
use App\Models\User;
use App\Services\SettingsService;
use Illuminate\Database\Seeder;

/**
 * Production-safe base data: the single owner account, categories and default settings.
 * Idempotent — safe to run more than once.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => mb_strtolower(env('ADMIN_EMAIL', 'owner@sanjgarva.in'))],
            [
                'name' => env('ADMIN_NAME', 'Owner'),
                'mobile' => env('ADMIN_MOBILE', '9999999999'),
                'password' => env('ADMIN_PASSWORD', 'ChangeMe@123'),
            ],
        );

        $categories = [
            ['Beer', 'बिअर'], ['Whisky', 'व्हिस्की'], ['Rum', 'रम'], ['Vodka', 'वोडका'],
            ['Wine', 'वाइन'], ['Brandy', 'ब्रँडी'], ['Gin', 'जिन'], ['Soft Drinks', 'शीतपेये'],
            ['Water & Soda', 'पाणी व सोडा'], ['Snacks', 'स्नॅक्स'], ['Other', 'इतर'],
        ];
        foreach ($categories as $i => [$name, $mr]) {
            Category::firstOrCreate(['name' => $name, 'parent_id' => null], ['name_mr' => $mr, 'sort_order' => $i]);
        }

        $expenseCategories = [
            ['Electricity', 'वीज बिल'], ['Salary', 'पगार'], ['Rent', 'भाडे'], ['Transportation', 'वाहतूक'],
            ['Maintenance', 'दुरुस्ती'], ['Food', 'जेवण'], ['Cleaning', 'स्वच्छता'], ['License / Tax', 'लायसन्स / कर'],
            ['Ice', 'बर्फ'], ['Other', 'इतर'],
        ];
        foreach ($expenseCategories as $i => [$name, $mr]) {
            ExpenseCategory::firstOrCreate(['name' => $name], ['name_mr' => $mr, 'sort_order' => $i]);
        }

        app(SettingsService::class)->update(array_merge(
            SettingsService::DEFAULTS,
            app(SettingsService::class)->all(),
        ));
    }
}

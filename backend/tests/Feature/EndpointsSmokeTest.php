<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\ExportController;
use App\Models\Customer;
use App\Models\Sale;
use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EndpointsSmokeTest extends TestCase
{
    use RefreshDatabase;

    public function test_all_read_endpoints_respond(): void
    {
        $this->seed(DemoSeeder::class);
        Sanctum::actingAs(User::first());
        $customer = Customer::first();
        $sale = Sale::first();

        $urls = [
            '/api/auth/me', '/api/settings', '/api/dashboard', '/api/categories', '/api/products?search=king',
            '/api/products/1', '/api/store-stock', '/api/shop-stock?status=attention', '/api/purchases',
            '/api/stock/movements?location=shop', '/api/stock/adjustments', '/api/sales?period=week',
            "/api/sales/{$sale->id}", '/api/customers?with_dues=1&sort=balance', "/api/customers/{$customer->id}",
            "/api/customers/{$customer->id}/ledger?from=2020-01-01&to=2099-12-31", '/api/expense-categories',
            '/api/expenses?period=month', '/api/reports/sales?group=week', '/api/reports/stock',
            '/api/reports/profit-loss?period=last_month', '/api/reports/udhari', '/api/reports/expenses',
        ];
        foreach ($urls as $url) {
            $this->getJson($url)->assertOk()->assertJsonPath('success', true);
        }

        foreach (ExportController::TYPES as $type) {
            $res = $this->get("/api/export/$type")->assertOk();
            $this->assertStringStartsWith("\xEF\xBB\xBF", $res->streamedContent());
        }

        $this->getJson('/api/export/unknown')->assertNotFound()->assertJsonPath('code', 'NOT_FOUND');
        $this->getJson('/api/products/99999')->assertNotFound();
    }
}

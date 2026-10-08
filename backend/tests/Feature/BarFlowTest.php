<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\ExpenseCategory;
use App\Models\Product;
use App\Models\ShopStock;
use App\Models\StockTransaction;
use App\Models\StoreStock;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * End-to-end business rules: store → shop → sale, udhari, payments, profit, validation.
 */
class BarFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        Sanctum::actingAs(User::first());
    }

    private function product(array $overrides = []): array
    {
        $res = $this->postJson('/api/products', array_merge([
            'name' => 'Kingfisher',
            'unit' => 'bottle',
            'min_stock' => 5,
            'cost_price' => 100,
            'selling_price' => 150,
            'opening_store' => 100,
            'opening_shop' => 20,
        ], $overrides))->assertCreated();

        return $res->json('data');
    }

    private function qty(int $productId): array
    {
        return [
            'store' => StoreStock::where('product_id', $productId)->value('quantity'),
            'shop' => ShopStock::where('product_id', $productId)->value('quantity'),
        ];
    }

    public function test_spec_stock_example_transfer_then_sell(): void
    {
        $p = $this->product();

        $this->postJson('/api/stock/transfer', ['items' => [['product_id' => $p['id'], 'quantity' => 10]]])->assertCreated();
        $this->assertSame(['store' => 90, 'shop' => 30], $this->qty($p['id']));

        $this->postJson('/api/sales', [
            'items' => [['product_id' => $p['id'], 'quantity' => 3]],
            'payment_method' => 'cash',
        ])->assertCreated()->assertJsonPath('data.total_amount', '450.00');

        $this->assertSame(['store' => 90, 'shop' => 27], $this->qty($p['id']));
        // opening(2) + transfer(2) + sale(1)
        $this->assertSame(5, StockTransaction::where('product_id', $p['id'])->count());
    }

    public function test_transfer_cannot_exceed_store_stock(): void
    {
        $p = $this->product(['opening_store' => 10, 'opening_shop' => 0]);

        $this->postJson('/api/stock/transfer', ['items' => [['product_id' => $p['id'], 'quantity' => 20]]], ['X-Locale' => 'mr'])
            ->assertStatus(422)
            ->assertJsonPath('code', 'INSUFFICIENT_STORE_STOCK')
            ->assertJsonPath('meta.available', 10);

        $this->assertSame(['store' => 10, 'shop' => 0], $this->qty($p['id']));
    }

    public function test_sale_cannot_exceed_shop_stock_and_rolls_back_everything(): void
    {
        $a = $this->product(['name' => 'A', 'opening_shop' => 10]);
        $b = $this->product(['name' => 'B', 'opening_shop' => 5]);

        $this->postJson('/api/sales', [
            'items' => [['product_id' => $a['id'], 'quantity' => 2], ['product_id' => $b['id'], 'quantity' => 7]],
            'payment_method' => 'cash',
        ])->assertStatus(422)
            ->assertJsonPath('code', 'INSUFFICIENT_STOCK')
            ->assertJsonPath('meta.available', 5)
            ->assertJsonPath('message', 'Only 5 available for B.');

        // Nothing changed for A either.
        $this->assertSame(10, $this->qty($a['id'])['shop']);
        $this->assertDatabaseCount('sales', 0);
    }

    public function test_udhari_sale_payment_and_ledger(): void
    {
        $p = $this->product();
        $c = $this->postJson('/api/customers', ['name' => 'Ramesh', 'mobile' => '9822012345'])->assertCreated()->json('data');

        // Udhari without customer is rejected.
        $this->postJson('/api/sales', ['items' => [['product_id' => $p['id'], 'quantity' => 1]], 'payment_method' => 'udhari'])
            ->assertStatus(422)->assertJsonValidationErrors('customer_id');

        $sale = fn (int $qty) => $this->postJson('/api/sales', [
            'items' => [['product_id' => $p['id'], 'quantity' => $qty, 'unit_price' => 100]],
            'payment_method' => 'udhari',
            'customer_id' => $c['id'],
        ])->assertCreated();

        $sale(5); // 500
        $sale(3); // 300
        $this->assertSame('800.00', Customer::find($c['id'])->balance);

        // Overpayment rejected.
        $this->postJson("/api/customers/{$c['id']}/payment", ['amount' => 900, 'payment_method' => 'cash'])
            ->assertStatus(422)->assertJsonPath('code', 'PAYMENT_EXCEEDS_BALANCE');

        $this->postJson("/api/customers/{$c['id']}/payment", ['amount' => 500, 'payment_method' => 'cash'])
            ->assertCreated()->assertJsonPath('data.balance', '300.00');

        $ledger = $this->getJson("/api/customers/{$c['id']}/ledger")->assertOk()->json('data');
        $this->assertSame(['500.00', '800.00', '300.00'], array_column($ledger['entries'], 'balance'));
        $this->assertSame('800.00', $ledger['total_debit']);
        $this->assertSame('500.00', $ledger['total_credit']);
        $this->assertSame('300.00', $ledger['customer']['balance']);
    }

    public function test_weighted_average_cost_and_historical_profit(): void
    {
        $p = $this->product(['opening_store' => 10, 'opening_shop' => 0, 'cost_price' => 100]);

        // 10 @ 100 + 10 @ 110 => avg 105
        $this->postJson('/api/store-stock/add', [
            'product_id' => $p['id'], 'quantity' => 10, 'cost_price' => 110, 'purchase_date' => now()->toDateString(),
        ])->assertCreated();
        $this->assertSame('105.0000', Product::find($p['id'])->avg_cost);
        $this->assertSame(20, $this->qty($p['id'])['store']);

        $this->postJson('/api/stock/transfer', ['items' => [['product_id' => $p['id'], 'quantity' => 5]]])->assertCreated();
        $this->postJson('/api/sales', ['items' => [['product_id' => $p['id'], 'quantity' => 5]], 'payment_method' => 'cash'])
            ->assertCreated()
            ->assertJsonPath('data.total_amount', '750.00')
            ->assertJsonPath('data.total_cost', '525.00')
            ->assertJsonPath('data.profit', '225.00');

        // A later, more expensive purchase must not change the profit of the earlier sale.
        $this->postJson('/api/store-stock/add', [
            'product_id' => $p['id'], 'quantity' => 15, 'cost_price' => 200, 'purchase_date' => now()->toDateString(),
        ])->assertCreated();

        $pl = $this->getJson('/api/reports/profit-loss?period=today')->assertOk()->json('data');
        $this->assertSame('750.00', $pl['revenue']);
        $this->assertSame('525.00', $pl['cogs']);
        $this->assertSame('225.00', $pl['gross_profit']);
    }

    public function test_profit_and_loss_with_expenses_matches_spec_example(): void
    {
        $p = $this->product(['opening_shop' => 10]);
        $this->postJson('/api/sales', ['items' => [['product_id' => $p['id'], 'quantity' => 5]], 'payment_method' => 'cash'])->assertCreated();
        $this->postJson('/api/expenses', [
            'expense_category_id' => ExpenseCategory::first()->id, 'amount' => 50, 'expense_date' => now()->toDateString(),
        ])->assertCreated();

        $d = $this->getJson('/api/dashboard')->assertOk()->json('data.today');
        $this->assertSame('750.00', $d['sales']);
        $this->assertSame('500.00', $d['cost']);
        $this->assertSame('250.00', $d['gross_profit']);
        $this->assertSame('50.00', $d['expenses']);
        $this->assertSame('200.00', $d['net_profit']);
        $this->assertSame('750.00', $d['cash']);
    }

    public function test_void_sale_restores_stock_and_udhari(): void
    {
        $p = $this->product(['opening_shop' => 10]);
        $c = $this->postJson('/api/customers', ['name' => 'Suresh', 'opening_balance' => 100])->json('data');
        $sale = $this->postJson('/api/sales', [
            'items' => [['product_id' => $p['id'], 'quantity' => 4]], 'payment_method' => 'udhari', 'customer_id' => $c['id'],
        ])->json('data');

        $this->assertSame('700.00', Customer::find($c['id'])->balance);
        $this->postJson("/api/sales/{$sale['id']}/void", ['reason' => 'Wrong entry'])->assertOk()->assertJsonPath('data.status', 'void');
        $this->postJson("/api/sales/{$sale['id']}/void")->assertStatus(422)->assertJsonPath('code', 'ALREADY_VOIDED');

        $this->assertSame(10, $this->qty($p['id'])['shop']);
        $this->assertSame('100.00', Customer::find($c['id'])->balance);
        $this->assertSame('0.00', $this->getJson('/api/dashboard')->json('data.today.sales'));
    }

    public function test_stock_adjustment_is_logged(): void
    {
        $p = $this->product(['opening_shop' => 20]);
        $this->postJson('/api/stock/adjust', [
            'product_id' => $p['id'], 'location' => 'shop', 'actual_quantity' => 18, 'reason' => 'broken',
        ])->assertCreated()->assertJsonPath('data.difference', -2);

        $this->assertSame(18, $this->qty($p['id'])['shop']);
        $this->assertDatabaseHas('stock_transactions', ['product_id' => $p['id'], 'type' => 'adjustment', 'quantity' => -2, 'balance_after' => 18]);

        $this->postJson('/api/stock/adjust', [
            'product_id' => $p['id'], 'location' => 'shop', 'actual_quantity' => 18, 'reason' => 'broken',
        ])->assertStatus(422)->assertJsonPath('code', 'NO_CHANGE');
    }

    public function test_stock_status_filters_and_summary(): void
    {
        $this->product(['name' => 'Good', 'opening_shop' => 20]);
        $this->product(['name' => 'Low', 'opening_shop' => 3]);
        $this->product(['name' => 'Out', 'opening_shop' => 0]);

        $res = $this->getJson('/api/shop-stock')->assertOk();
        $this->assertSame(1, $res->json('meta.summary.low'));
        $this->assertSame(1, $res->json('meta.summary.out'));
        $this->assertSame(23, $res->json('meta.summary.total_qty'));

        $this->assertSame(['Low'], array_column($this->getJson('/api/shop-stock?status=low')->json('data'), 'name'));
        $this->assertSame(['Out'], array_column($this->getJson('/api/shop-stock?status=out')->json('data'), 'name'));
    }

    public function test_requires_authentication_and_hides_errors(): void
    {
        $this->app['auth']->forgetGuards();
        $this->withHeaders(['Authorization' => ''])->getJson('/api/dashboard')
            ->assertStatus(401)
            ->assertJsonPath('code', 'UNAUTHENTICATED');
    }

    public function test_login_with_mobile_and_email(): void
    {
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/auth/login', ['login' => '9999999999', 'password' => 'ChangeMe@123'])
            ->assertOk()->assertJsonStructure(['data' => ['token', 'user']]);
        $this->postJson('/api/auth/login', ['login' => 'owner@sanjgarva.in', 'password' => 'wrong'], ['X-Locale' => 'mr'])
            ->assertStatus(422)
            ->assertJsonPath('errors.login.0', 'मोबाईल/ईमेल किंवा पासवर्ड चुकीचा आहे.');
    }
}

<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\CustomerTransaction;
use App\Models\Expense;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Support\DateRange;
use App\Support\Money;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Read-only aggregates. All money sums are done in SQL on NUMERIC columns and returned as strings.
 */
class ReportService
{
    public function salesSummary(DateRange $range): array
    {
        $row = $this->salesQuery($range)
            ->selectRaw('COUNT(*) AS transactions')
            ->selectRaw('COALESCE(SUM(total_amount), 0) AS sales')
            ->selectRaw('COALESCE(SUM(total_cost), 0) AS cost')
            ->selectRaw('COALESCE(SUM(profit), 0) AS profit')
            ->selectRaw('COALESCE(SUM(total_qty), 0) AS qty')
            ->selectRaw("COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) AS cash")
            ->selectRaw("COALESCE(SUM(CASE WHEN payment_method = 'udhari' THEN total_amount ELSE 0 END), 0) AS udhari")
            ->selectRaw("COALESCE(SUM(CASE WHEN payment_method = 'other' THEN total_amount ELSE 0 END), 0) AS other")
            ->toBase()
            ->first();

        return [
            'transactions' => (int) $row->transactions,
            'sales' => Money::round($row->sales, 2),
            'cash' => Money::round($row->cash, 2),
            'udhari' => Money::round($row->udhari, 2),
            'other' => Money::round($row->other, 2),
            'cost' => Money::round($row->cost, 2),
            'gross_profit' => Money::round($row->profit, 2),
            'gross_margin' => Money::percent($row->profit, $row->sales),
            'qty' => (int) $row->qty,
        ];
    }

    /** Sales grouped by day, week (starting Monday) or month. */
    public function salesSeries(DateRange $range, string $group = 'day'): array
    {
        $daily = $this->salesQuery($range)
            ->selectRaw('DATE(sold_at) AS day')
            ->selectRaw('COUNT(*) AS transactions')
            ->selectRaw('SUM(total_amount) AS sales')
            ->selectRaw('SUM(total_cost) AS cost')
            ->selectRaw('SUM(profit) AS profit')
            ->selectRaw('SUM(total_qty) AS qty')
            ->selectRaw("SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END) AS cash")
            ->selectRaw("SUM(CASE WHEN payment_method = 'udhari' THEN total_amount ELSE 0 END) AS udhari")
            ->selectRaw("SUM(CASE WHEN payment_method = 'other' THEN total_amount ELSE 0 END) AS other")
            ->groupByRaw('DATE(sold_at)')
            ->orderByRaw('DATE(sold_at)')
            ->toBase()
            ->get();

        $rows = [];
        foreach ($daily as $d) {
            $date = Carbon::parse($d->day);
            $key = match ($group) {
                'week' => $date->copy()->startOfWeek()->toDateString(),
                'month' => $date->format('Y-m'),
                default => $date->toDateString(),
            };
            $rows[$key] ??= ['period' => $key, 'transactions' => 0, 'qty' => 0, 'sales' => '0', 'cash' => '0', 'udhari' => '0', 'other' => '0', 'cost' => '0', 'profit' => '0'];
            $rows[$key]['transactions'] += (int) $d->transactions;
            $rows[$key]['qty'] += (int) $d->qty;
            foreach (['sales', 'cash', 'udhari', 'other', 'cost', 'profit'] as $f) {
                $rows[$key][$f] = Money::round(Money::add($rows[$key][$f], $d->{$f}), 2);
            }
        }

        return array_values($rows);
    }

    public function topProducts(DateRange $range, int $limit = 10): array
    {
        return SaleItem::query()
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.status', 'completed')
            ->when($range->from, fn ($q) => $q->where('sales.sold_at', '>=', $range->from))
            ->when($range->to, fn ($q) => $q->where('sales.sold_at', '<=', $range->to))
            ->groupBy('sale_items.product_id', 'sale_items.product_name')
            ->select('sale_items.product_id', 'sale_items.product_name')
            ->selectRaw('SUM(sale_items.quantity) AS qty')
            ->selectRaw('SUM(sale_items.line_total) AS sales')
            ->selectRaw('SUM(sale_items.line_profit) AS profit')
            ->orderByDesc('qty')
            ->limit($limit)
            ->toBase()
            ->get()
            ->map(fn ($r) => [
                'product_id' => (int) $r->product_id,
                'product_name' => $r->product_name,
                'qty' => (int) $r->qty,
                'sales' => Money::round($r->sales, 2),
                'profit' => Money::round($r->profit, 2),
            ])
            ->all();
    }

    public function expenseTotal(DateRange $range): string
    {
        return Money::round($this->expenseQuery($range)->sum('amount'), 2);
    }

    public function expensesByCategory(DateRange $range): array
    {
        return $this->expenseQuery($range)
            ->join('expense_categories', 'expense_categories.id', '=', 'expenses.expense_category_id')
            ->groupBy('expense_categories.id', 'expense_categories.name', 'expense_categories.name_mr')
            ->select('expense_categories.id', 'expense_categories.name', 'expense_categories.name_mr')
            ->selectRaw('SUM(expenses.amount) AS total, COUNT(*) AS count')
            ->orderByDesc('total')
            ->toBase()
            ->get()
            ->map(fn ($r) => [
                'category_id' => (int) $r->id,
                'name' => $r->name,
                'name_mr' => $r->name_mr,
                'total' => Money::round($r->total, 2),
                'count' => (int) $r->count,
            ])
            ->all();
    }

    public function expensesByDate(DateRange $range): array
    {
        return $this->expenseQuery($range)
            ->groupBy('expense_date')
            ->select('expense_date')
            ->selectRaw('SUM(amount) AS total, COUNT(*) AS count')
            ->orderBy('expense_date')
            ->toBase()
            ->get()
            ->map(fn ($r) => [
                'date' => substr((string) $r->expense_date, 0, 10),
                'total' => Money::round($r->total, 2),
                'count' => (int) $r->count,
            ])
            ->all();
    }

    public function profitLoss(DateRange $range): array
    {
        $sales = $this->salesSummary($range);
        $expenses = $this->expenseTotal($range);
        $net = Money::round(Money::sub($sales['gross_profit'], $expenses), 2);

        return [
            'range' => $range->toArray(),
            'revenue' => $sales['sales'],
            'cogs' => $sales['cost'],
            'gross_profit' => $sales['gross_profit'],
            'gross_margin' => $sales['gross_margin'],
            'expenses' => $expenses,
            'expenses_by_category' => $this->expensesByCategory($range),
            'net_profit' => $net,
            'net_margin' => Money::percent($net, $sales['sales']),
            'transactions' => $sales['transactions'],
            'qty' => $sales['qty'],
        ];
    }

    /** Current stock per product and per location, valued at weighted average cost. */
    public function stock(): array
    {
        $products = Product::query()->withStock()
            ->with('category:id,name,name_mr')
            ->orderBy('products.name')
            ->get();

        $totals = [
            'store' => ['qty' => 0, 'value' => '0', 'low' => 0, 'out' => 0],
            'shop' => ['qty' => 0, 'value' => '0', 'low' => 0, 'out' => 0],
        ];

        $items = $products->map(function (Product $p) use (&$totals) {
            $row = [
                'id' => $p->id,
                'name' => $p->name,
                'name_mr' => $p->name_mr,
                'category' => $p->category?->name,
                'category_mr' => $p->category?->name_mr,
                'unit' => $p->unit,
                'bottle_size' => $p->bottle_size,
                'is_active' => $p->is_active,
                'min_stock' => $p->min_stock,
                'avg_cost' => Money::round($p->avg_cost, 2),
                'selling_price' => $p->selling_price,
            ];
            foreach (['store', 'shop'] as $loc) {
                $qty = (int) $p->{$loc.'_qty'};
                $value = Money::round(Money::mul($qty, $p->avg_cost), 2);
                $status = Product::statusFor($qty, $p->min_stock);
                $row[$loc.'_qty'] = $qty;
                $row[$loc.'_value'] = $value;
                $row[$loc.'_status'] = $status;
                if ($p->is_active) {
                    $totals[$loc]['qty'] += $qty;
                    $totals[$loc]['value'] = Money::round(Money::add($totals[$loc]['value'], $value), 2);
                    $totals[$loc]['low'] += $status === 'low' ? 1 : 0;
                    $totals[$loc]['out'] += $status === 'out' ? 1 : 0;
                }
            }
            $row['total_qty'] = $row['store_qty'] + $row['shop_qty'];
            $row['total_value'] = Money::round(Money::add($row['store_value'], $row['shop_value']), 2);

            return $row;
        });

        return [
            'totals' => $totals + [
                'products' => $products->where('is_active', true)->count(),
                'qty' => $totals['store']['qty'] + $totals['shop']['qty'],
                'value' => Money::round(Money::add($totals['store']['value'], $totals['shop']['value']), 2),
            ],
            'items' => $items->values()->all(),
        ];
    }

    public function udhari(DateRange $range): array
    {
        $outstanding = Customer::where('balance', '>', 0)
            ->selectRaw('COALESCE(SUM(balance), 0) AS total, COUNT(*) AS count')
            ->toBase()->first();

        $period = CustomerTransaction::query()
            ->when($range->from, fn ($q) => $q->where('transaction_date', '>=', $range->from))
            ->when($range->to, fn ($q) => $q->where('transaction_date', '<=', $range->to))
            ->selectRaw("COALESCE(SUM(CASE WHEN type = 'sale' THEN debit ELSE 0 END), 0) AS given")
            ->selectRaw("COALESCE(SUM(CASE WHEN type = 'payment' THEN credit ELSE 0 END), 0) AS received")
            ->toBase()->first();

        $customers = Customer::query()
            ->where('balance', '<>', 0)
            ->withTotals()
            ->orderByDesc('balance')
            ->limit(500)
            ->get(['id', 'name', 'mobile', 'balance'])
            ->map(fn (Customer $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'mobile' => $c->mobile,
                'total_debit' => Money::round($c->total_debit, 2),
                'total_credit' => Money::round($c->total_credit, 2),
                'balance' => $c->balance,
            ]);

        return [
            'range' => $range->toArray(),
            'total_outstanding' => Money::round($outstanding->total, 2),
            'customers_with_dues' => (int) $outstanding->count,
            'udhari_given' => Money::round($period->given, 2),
            'payments_received' => Money::round($period->received, 2),
            'customers' => $customers->all(),
        ];
    }

    public function dashboard(): array
    {
        $today = DateRange::period('today');
        $sales = $this->salesSummary($today);
        $expenses = $this->expenseTotal($today);

        $shopCounts = $this->stockStatusCounts('shop_stock');
        $storeCounts = $this->stockStatusCounts('store_stock');

        $outstanding = Customer::where('balance', '>', 0)
            ->selectRaw('COALESCE(SUM(balance), 0) AS total, COUNT(*) AS count')
            ->toBase()->first();

        $week = new DateRange(now()->subDays(6)->startOfDay(), now()->endOfDay());
        $series = collect($this->salesSeries($week))->keyBy('period');
        $last7 = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = now()->subDays($i)->toDateString();
            $last7[] = [
                'date' => $day,
                'sales' => $series[$day]['sales'] ?? '0.00',
                'profit' => $series[$day]['profit'] ?? '0.00',
            ];
        }

        $lowItems = Product::query()->withStock()
            ->where('products.is_active', true)
            ->whereRaw('COALESCE(shop_stock.quantity, 0) <= products.min_stock')
            ->orderByRaw('COALESCE(shop_stock.quantity, 0)')
            ->limit(6)
            ->get()
            ->map(fn (Product $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'name_mr' => $p->name_mr,
                'shop_qty' => (int) $p->shop_qty,
                'store_qty' => (int) $p->store_qty,
                'min_stock' => $p->min_stock,
                'unit' => $p->unit,
                'status' => Product::statusFor((int) $p->shop_qty, $p->min_stock),
            ]);

        $recent = Sale::with('customer:id,name')
            ->completed()
            ->orderByDesc('sold_at')->orderByDesc('id')
            ->limit(5)
            ->get(['id', 'invoice_no', 'customer_id', 'payment_method', 'total_amount', 'total_qty', 'sold_at', 'status']);

        return [
            'today' => $sales + [
                'expenses' => $expenses,
                'net_profit' => Money::round(Money::sub($sales['gross_profit'], $expenses), 2),
            ],
            'stock' => ['shop' => $shopCounts, 'store' => $storeCounts],
            'outstanding_udhari' => Money::round($outstanding->total, 2),
            'customers_with_dues' => (int) $outstanding->count,
            'last_7_days' => $last7,
            'low_stock_items' => $lowItems->all(),
            'recent_sales' => $recent->map(fn (Sale $s) => [
                'id' => $s->id,
                'invoice_no' => $s->invoice_no,
                'customer_name' => $s->customer?->name,
                'payment_method' => $s->payment_method,
                'total_amount' => $s->total_amount,
                'total_qty' => $s->total_qty,
                'sold_at' => $s->sold_at->toIso8601String(),
            ])->all(),
        ];
    }

    /** Count active products by status for a stock table. */
    public function stockStatusCounts(string $table): array
    {
        $row = DB::table('products')
            ->leftJoin($table, "$table.product_id", '=', 'products.id')
            ->where('products.is_active', true)
            ->selectRaw("SUM(CASE WHEN COALESCE($table.quantity, 0) <= 0 THEN 1 ELSE 0 END) AS out_count")
            ->selectRaw("SUM(CASE WHEN COALESCE($table.quantity, 0) > 0 AND COALESCE($table.quantity, 0) <= products.min_stock THEN 1 ELSE 0 END) AS low_count")
            ->selectRaw('COUNT(*) AS total')
            ->first();

        return ['low' => (int) $row->low_count, 'out' => (int) $row->out_count, 'products' => (int) $row->total];
    }

    private function salesQuery(DateRange $range): Builder
    {
        return Sale::query()
            ->completed()
            ->when($range->from, fn ($q) => $q->where('sold_at', '>=', $range->from))
            ->when($range->to, fn ($q) => $q->where('sold_at', '<=', $range->to));
    }

    private function expenseQuery(DateRange $range): Builder
    {
        return Expense::query()
            ->when($range->from, fn ($q) => $q->where('expense_date', '>=', $range->from->toDateString()))
            ->when($range->to, fn ($q) => $q->where('expense_date', '<=', $range->to->toDateString()));
    }
}

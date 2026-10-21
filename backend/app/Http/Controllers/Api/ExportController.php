<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerTransaction;
use App\Models\Expense;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockTransaction;
use App\Services\ReportService;
use App\Services\SettingsService;
use App\Support\DateRange;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * CSV exports (UTF-8 with BOM so Excel shows Marathi correctly). Rows are streamed in chunks.
 */
class ExportController extends Controller
{
    public const TYPES = ['product-sales', 'sales', 'sale-items', 'customers', 'udhari', 'expenses', 'stock', 'movements', 'purchases'];

    public function __invoke(Request $request, string $type, ReportService $reports): StreamedResponse
    {
        abort_unless(in_array($type, self::TYPES, true), 404);
        $range = DateRange::fromRequest($request, 'all');
        $filename = 'saanj-garva-'.$type.'-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($type, $range, $reports) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            $this->write($out, $type, $range, $reports);
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * Product-wise sales sheet: title block, one row per product, a TOTAL row and a profit / loss
     * summary. Amounts are plain numbers so Excel can sum and format them.
     */
    private function productSales($out, DateRange $range, ReportService $reports): void
    {
        $report = $reports->productSales($range);
        $totals = $report['totals'];
        $bar = app(SettingsService::class)->get('bar_name') ?: config('app.name');
        $period = $range->from || $range->to
            ? ($range->from?->format('d-m-Y') ?? '…').' to '.($range->to?->format('d-m-Y') ?? '…')
            : 'All time';

        fputcsv($out, [$bar.' - Product-wise Sales Report']);
        fputcsv($out, ['Period', $period]);
        fputcsv($out, ['Generated', now()->format('d-m-Y H:i')]);
        fputcsv($out, []);

        fputcsv($out, ['Sr', 'Product', 'Size', 'Category', 'Qty Sold', 'Avg Cost Rate', 'Avg Selling Rate', 'Total Cost', 'Total Selling', 'Profit / Loss', 'Margin %']);
        foreach ($report['rows'] as $i => $r) {
            fputcsv($out, [$i + 1, $r['name'], $r['bottle_size'], $r['category'], $r['qty'], $r['avg_cost'], $r['avg_price'],
                $r['cost'], $r['sales'], $r['profit'], $r['margin']]);
        }
        fputcsv($out, ['', 'TOTAL', '', '', $totals['qty'], '', '', $totals['cost'], $totals['sales'], $totals['profit'], $totals['margin']]);
        fputcsv($out, []);

        $net = $totals['net_profit'];
        fputcsv($out, ['Summary']);
        fputcsv($out, ['Products sold', $totals['products']]);
        fputcsv($out, ['Total stock sold (qty)', $totals['qty']]);
        fputcsv($out, ['Total selling amount', $totals['sales']]);
        fputcsv($out, ['Total cost', $totals['cost']]);
        fputcsv($out, ['Gross profit', $totals['profit']]);
        fputcsv($out, ['Bar expenses', $totals['expenses']]);
        fputcsv($out, [str_starts_with($net, '-') ? 'NET LOSS' : 'NET PROFIT', $net]);
    }

    private function write($out, string $type, DateRange $range, ReportService $reports): void
    {
        $between = function ($query, string $column, bool $dateOnly = false) use ($range) {
            return $query
                ->when($range->from, fn ($q) => $q->where($column, '>=', $dateOnly ? $range->from->toDateString() : $range->from))
                ->when($range->to, fn ($q) => $q->where($column, '<=', $dateOnly ? $range->to->toDateString() : $range->to));
        };

        switch ($type) {
            case 'product-sales':
                $this->productSales($out, $range, $reports);
                break;

            case 'sales':
                fputcsv($out, ['Bill No', 'Date', 'Customer', 'Payment', 'Qty', 'Amount', 'Cost', 'Profit', 'Status']);
                $between(Sale::with('customer:id,name'), 'sold_at')->orderBy('id')->chunk(500, function ($rows) use ($out) {
                    foreach ($rows as $s) {
                        fputcsv($out, [$s->invoice_no, $s->sold_at->format('Y-m-d H:i'), $s->customer?->name, $s->payment_method,
                            $s->total_qty, $s->total_amount, $s->total_cost, $s->profit, $s->status]);
                    }
                });
                break;

            case 'sale-items':
                fputcsv($out, ['Bill No', 'Date', 'Product', 'Qty', 'Rate', 'Amount', 'Cost', 'Profit', 'Status']);
                $between(SaleItem::query()->join('sales', 'sales.id', '=', 'sale_items.sale_id')
                    ->select('sale_items.*', 'sales.invoice_no', 'sales.sold_at', 'sales.status'), 'sales.sold_at')
                    ->orderBy('sale_items.id')
                    ->chunk(500, function ($rows) use ($out) {
                        foreach ($rows as $i) {
                            fputcsv($out, [$i->invoice_no, substr((string) $i->sold_at, 0, 16), $i->product_name, $i->quantity,
                                $i->unit_price, $i->line_total, $i->line_cost, $i->line_profit, $i->status]);
                        }
                    });
                break;

            case 'customers':
                fputcsv($out, ['Name', 'Mobile', 'Address', 'Total Udhari', 'Paid', 'Outstanding']);
                Customer::withTotals()->orderBy('name')->chunk(500, function ($rows) use ($out) {
                    foreach ($rows as $c) {
                        fputcsv($out, [$c->name, $c->mobile, $c->address, $c->total_debit ?? 0, $c->total_credit ?? 0, $c->balance]);
                    }
                });
                break;

            case 'udhari':
                fputcsv($out, ['Date', 'Customer', 'Mobile', 'Type', 'Bill No', 'Debit (Udhari)', 'Credit (Paid)', 'Payment Method', 'Notes']);
                $between(CustomerTransaction::with(['customer:id,name,mobile', 'sale:id,invoice_no']), 'transaction_date')
                    ->orderBy('transaction_date')->orderBy('id')
                    ->chunk(500, function ($rows) use ($out) {
                        foreach ($rows as $t) {
                            fputcsv($out, [$t->transaction_date->format('Y-m-d H:i'), $t->customer?->name, $t->customer?->mobile, $t->type,
                                $t->sale?->invoice_no, $t->debit, $t->credit, $t->payment_method, $t->notes]);
                        }
                    });
                break;

            case 'expenses':
                fputcsv($out, ['Date', 'Category', 'Amount', 'Payment Method', 'Description']);
                $between(Expense::ofKind('bar')->with('category:id,name'), 'expense_date', true)->orderBy('expense_date')->orderBy('id')
                    ->chunk(500, function ($rows) use ($out) {
                        foreach ($rows as $e) {
                            fputcsv($out, [$e->expense_date->toDateString(), $e->category?->name, $e->amount, $e->payment_method, $e->description]);
                        }
                    });
                break;

            case 'stock':
                fputcsv($out, ['Product', 'Category', 'Unit', 'Size', 'Store Qty', 'Shop Qty', 'Total Qty', 'Avg Cost', 'Selling Price', 'Stock Value', 'Shop Status']);
                foreach ($reports->stock()['items'] as $p) {
                    fputcsv($out, [$p['name'], $p['category'], $p['unit'], $p['bottle_size'], $p['store_qty'], $p['shop_qty'],
                        $p['total_qty'], $p['avg_cost'], $p['selling_price'], $p['total_value'], $p['shop_status']]);
                }
                break;

            case 'movements':
                fputcsv($out, ['Date', 'Product', 'Location', 'Type', 'Quantity', 'Balance After', 'Reference', 'Notes']);
                $between(StockTransaction::with('product:id,name'), 'created_at')->orderBy('id')
                    ->chunk(500, function ($rows) use ($out) {
                        foreach ($rows as $m) {
                            fputcsv($out, [$m->created_at->format('Y-m-d H:i'), $m->product?->name, $m->location, $m->type,
                                $m->quantity, $m->balance_after, trim($m->reference_type.' '.$m->reference_id), $m->notes]);
                        }
                    });
                break;

            case 'purchases':
                fputcsv($out, ['Date', 'Product', 'Qty', 'Unit Cost', 'Total Cost', 'Supplier', 'Invoice No', 'Notes']);
                $between(Purchase::with('product:id,name'), 'purchase_date', true)->orderBy('purchase_date')->orderBy('id')
                    ->chunk(500, function ($rows) use ($out) {
                        foreach ($rows as $p) {
                            fputcsv($out, [$p->purchase_date->toDateString(), $p->product?->name, $p->quantity, $p->unit_cost,
                                $p->total_cost, $p->supplier, $p->invoice_no, $p->notes]);
                        }
                    });
                break;
        }
    }
}

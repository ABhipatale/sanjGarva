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
use App\Support\DateRange;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * CSV exports (UTF-8 with BOM so Excel shows Marathi correctly). Rows are streamed in chunks.
 */
class ExportController extends Controller
{
    public const TYPES = ['sales', 'sale-items', 'customers', 'udhari', 'expenses', 'stock', 'movements', 'purchases'];

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

    private function write($out, string $type, DateRange $range, ReportService $reports): void
    {
        $between = function ($query, string $column, bool $dateOnly = false) use ($range) {
            return $query
                ->when($range->from, fn ($q) => $q->where($column, '>=', $dateOnly ? $range->from->toDateString() : $range->from))
                ->when($range->to, fn ($q) => $q->where($column, '<=', $dateOnly ? $range->to->toDateString() : $range->to));
        };

        switch ($type) {
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
                $between(Expense::with('category:id,name'), 'expense_date', true)->orderBy('expense_date')->orderBy('id')
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

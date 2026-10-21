import i18n from '../locales'
import { downloadPdf, fileSlug, pdfDate, pdfDateTime, pdfMoney, pdfPeriod, pdfQty } from './pdf'
import { isoDate, localName, toNumber } from './format'

// One builder per PDF in the app. Each one is a direct download in the shared Excel-style layout.

const t = (...args) => i18n.t(...args)
const barName = (settings) => localName(settings, 'bar_name') || t('app.name')
const stamp = () => isoDate()
const withSize = (r) => [localName(r), r.bottle_size].filter(Boolean).join(' · ')
const netLine = (value) => {
  const loss = toNumber(value) < 0
  return [loss ? t('reports.netLoss') : t('reports.netProfit'), pdfMoney(value), { strong: true, tone: loss ? 'red' : 'green' }]
}

/** Product-wise sales: every product sold on every date, day totals, product summary, profit / loss. */
export function productSalesPdf(d, settings) {
  const tot = d.totals
  const byDay = new Map()
  for (const r of d.daily) {
    if (!byDay.has(r.date)) byDay.set(r.date, [])
    byDay.get(r.date).push(r)
  }
  const rows = []
  for (const [date, list] of byDay) {
    for (const r of list) {
      rows.push([pdfDate(date), withSize(r), pdfQty(r.qty), pdfMoney(r.avg_cost), pdfMoney(r.avg_price), pdfMoney(r.cost), pdfMoney(r.sales), pdfMoney(r.profit), `${r.margin}%`])
    }
    if (list.length > 1) {
      const sum = (k) => list.reduce((s, r) => s + toNumber(r[k]), 0)
      rows.push({
        style: 'subtotal',
        cells: [pdfDate(date), t('pdf.dayTotal'), pdfQty(sum('qty')), '', '', pdfMoney(sum('cost')), pdfMoney(sum('sales')), pdfMoney(sum('profit')), ''],
      })
    }
  }

  return downloadPdf({
    filename: `product-sales-${d.range.from || 'all'}-to-${d.range.to || stamp()}.pdf`,
    title: barName(settings),
    subtitle: t('pdf.productSalesReport'),
    meta: [[t('pdf.period'), pdfPeriod(d.range)], [t('pdf.productsSold'), pdfQty(tot.products)]],
    sections: [
      {
        heading: t('pdf.dateWise'),
        columns: [
          { header: t('common.date'), width: 52 },
          { header: t('products.name') },
          { header: t('reports.qtySold'), align: 'right', width: 36 },
          { header: t('reports.avgCost'), align: 'right', width: 52 },
          { header: t('reports.avgPrice'), align: 'right', width: 52 },
          { header: t('reports.totalCost'), align: 'right', width: 62 },
          { header: t('reports.totalSelling'), align: 'right', width: 64 },
          { header: t('sales.profit'), align: 'right', width: 58 },
          { header: '%', align: 'right', width: 32 },
        ],
        rows,
        foot: ['', t('pdf.grandTotal'), pdfQty(tot.qty), '', '', pdfMoney(tot.cost), pdfMoney(tot.sales), pdfMoney(tot.profit), `${tot.margin}%`],
      },
      {
        heading: t('pdf.productWise'),
        columns: [
          { header: '#', align: 'right', width: 22 },
          { header: t('products.name') },
          { header: t('reports.qtySold'), align: 'right', width: 36 },
          { header: t('reports.avgCost'), align: 'right', width: 52 },
          { header: t('reports.avgPrice'), align: 'right', width: 52 },
          { header: t('reports.totalCost'), align: 'right', width: 62 },
          { header: t('reports.totalSelling'), align: 'right', width: 64 },
          { header: t('sales.profit'), align: 'right', width: 58 },
          { header: '%', align: 'right', width: 32 },
        ],
        rows: d.rows.map((r, i) => [i + 1, withSize(r), pdfQty(r.qty), pdfMoney(r.avg_cost), pdfMoney(r.avg_price), pdfMoney(r.cost), pdfMoney(r.sales), pdfMoney(r.profit), `${r.margin}%`]),
        foot: ['', t('pdf.grandTotal'), pdfQty(tot.qty), '', '', pdfMoney(tot.cost), pdfMoney(tot.sales), pdfMoney(tot.profit), `${tot.margin}%`],
      },
    ],
    summary: [
      [t('reports.totalQtySold'), pdfQty(tot.qty)],
      [t('reports.totalSelling'), pdfMoney(tot.sales)],
      [t('reports.totalCost'), pdfMoney(tot.cost)],
      [t('reports.grossProfit'), pdfMoney(tot.profit)],
      [`- ${t('reports.expenses_total')}`, pdfMoney(tot.expenses)],
      netLine(tot.net_profit),
    ],
  })
}

/** Sales by day / week / month. */
export function salesPdf(d, settings, periodLabel) {
  const s = d.summary
  return downloadPdf({
    filename: `sales-${d.range.from || 'all'}-to-${d.range.to || stamp()}.pdf`,
    title: barName(settings),
    subtitle: t('pdf.salesReport'),
    meta: [[t('pdf.period'), pdfPeriod(d.range)]],
    sections: [
      {
        columns: [
          { header: t('reports.period') },
          { header: t('pdf.bills'), align: 'right' },
          { header: t('common.qty'), align: 'right' },
          { header: t('sales.cash'), align: 'right' },
          { header: t('sales.udhari'), align: 'right' },
          { header: t('sales.other'), align: 'right' },
          { header: t('reports.salesRevenue'), align: 'right' },
          { header: t('sales.cost'), align: 'right' },
          { header: t('sales.profit'), align: 'right' },
        ],
        rows: d.rows.map((r) => [periodLabel(r.period), pdfQty(r.transactions), pdfQty(r.qty), pdfMoney(r.cash), pdfMoney(r.udhari), pdfMoney(r.other), pdfMoney(r.sales), pdfMoney(r.cost), pdfMoney(r.profit)]),
        foot: [t('pdf.grandTotal'), pdfQty(s.transactions), pdfQty(s.qty), pdfMoney(s.cash), pdfMoney(s.udhari), pdfMoney(s.other), pdfMoney(s.sales), pdfMoney(s.cost), pdfMoney(s.gross_profit)],
      },
    ],
    summary: [
      [t('reports.salesRevenue'), pdfMoney(s.sales)],
      [t('sales.cost'), pdfMoney(s.cost)],
      [`${t('reports.grossProfit')} (${s.gross_margin}%)`, pdfMoney(s.gross_profit), { strong: true, tone: 'green' }],
    ],
  })
}

/** Profit & loss statement. */
export function profitPdf(d, settings) {
  return downloadPdf({
    filename: `profit-loss-${d.range.from || 'all'}-to-${d.range.to || stamp()}.pdf`,
    title: barName(settings),
    subtitle: t('pdf.profitLossReport'),
    meta: [[t('pdf.period'), pdfPeriod(d.range)], [t('pdf.bills'), pdfQty(d.transactions)]],
    sections: [
      {
        columns: [{ header: t('pdf.particulars') }, { header: t('common.amount'), align: 'right', width: 130 }],
        rows: [
          [t('reports.salesRevenue'), pdfMoney(d.revenue)],
          [`- ${t('reports.cogs')}`, pdfMoney(d.cogs)],
          { style: 'subtotal', cells: [`= ${t('reports.grossProfit')} (${d.gross_margin}%)`, pdfMoney(d.gross_profit)] },
          [`- ${t('reports.expenses_total')}`, pdfMoney(d.expenses)],
        ],
        foot: [`= ${toNumber(d.net_profit) < 0 ? t('reports.netLoss') : t('reports.netProfit')} (${d.net_margin}%)`, pdfMoney(d.net_profit)],
      },
      ...(d.expenses_by_category.length
        ? [{
            heading: `${t('reports.expenses_total')} · ${t('reports.categoryWise')}`,
            columns: [{ header: t('expenses.category') }, { header: t('common.amount'), align: 'right', width: 130 }],
            rows: d.expenses_by_category.map((c) => [localName(c), pdfMoney(c.total)]),
            foot: [t('pdf.grandTotal'), pdfMoney(d.expenses)],
          }]
        : []),
    ],
    summary: [netLine(d.net_profit)],
  })
}

/** Current stock in Store and Shop, valued at average cost. */
export function stockPdf(d, items, settings) {
  return downloadPdf({
    filename: `stock-${stamp()}.pdf`,
    title: barName(settings),
    subtitle: t('pdf.stockReport'),
    meta: [[t('pdf.asOn'), pdfDateTime(new Date())], [t('stock.totalProducts'), pdfQty(items.length)]],
    sections: [
      {
        columns: [
          { header: '#', align: 'right', width: 22 },
          { header: t('products.name') },
          { header: t('products.category'), width: 76 },
          { header: t('stock.store'), align: 'right', width: 44 },
          { header: t('stock.shop'), align: 'right', width: 44 },
          { header: t('reports.totalStock'), align: 'right', width: 44 },
          { header: t('products.avgCost'), align: 'right', width: 60 },
          { header: t('stock.stockValue'), align: 'right', width: 72 },
        ],
        rows: items.map((p, i) => [i + 1, withSize(p), localName(p, 'category') || '', pdfQty(p.store_qty), pdfQty(p.shop_qty), pdfQty(p.total_qty), pdfMoney(p.avg_cost), pdfMoney(p.total_value)]),
        foot: ['', t('pdf.grandTotal'), '', pdfQty(d.totals.store.qty), pdfQty(d.totals.shop.qty), pdfQty(d.totals.qty), '', pdfMoney(d.totals.value)],
      },
    ],
    summary: [
      [t('stock.storeStock'), pdfMoney(d.totals.store.value)],
      [t('stock.shopStock'), pdfMoney(d.totals.shop.value)],
      [t('stock.stockValue'), pdfMoney(d.totals.value), { strong: true }],
    ],
  })
}

/** Customer-wise udhari outstanding. */
export function udhariPdf(d, settings) {
  const sum = (k) => d.customers.reduce((s, c) => s + toNumber(c[k]), 0)
  return downloadPdf({
    filename: `udhari-${stamp()}.pdf`,
    title: barName(settings),
    subtitle: t('pdf.udhariReport'),
    meta: [[t('pdf.period'), pdfPeriod(d.range)], [t('customers.withDues'), pdfQty(d.customers_with_dues)]],
    sections: [
      {
        columns: [
          { header: '#', align: 'right', width: 24 },
          { header: t('customers.name') },
          { header: t('customers.mobile'), width: 80 },
          { header: t('customers.totalUdhari'), align: 'right', width: 84 },
          { header: t('customers.paid'), align: 'right', width: 84 },
          { header: t('customers.remaining'), align: 'right', width: 84 },
        ],
        rows: d.customers.map((c, i) => [i + 1, c.name, c.mobile || '', pdfMoney(c.total_debit), pdfMoney(c.total_credit), pdfMoney(c.balance)]),
        foot: ['', t('pdf.grandTotal'), '', pdfMoney(sum('total_debit')), pdfMoney(sum('total_credit')), pdfMoney(sum('balance'))],
      },
    ],
    summary: [
      [t('reports.udhariGiven'), pdfMoney(d.udhari_given)],
      [t('reports.paymentsReceived'), pdfMoney(d.payments_received)],
      [t('reports.totalOutstanding'), pdfMoney(d.total_outstanding), { strong: true, tone: 'red' }],
    ],
  })
}

/** Bar expenses by category and by date. */
export function expensesPdf(d, settings) {
  return downloadPdf({
    filename: `expenses-${d.range.from || 'all'}-to-${d.range.to || stamp()}.pdf`,
    title: barName(settings),
    subtitle: t('pdf.expenseReport'),
    meta: [[t('pdf.period'), pdfPeriod(d.range)]],
    sections: [
      {
        heading: t('reports.dateWise'),
        columns: [{ header: t('common.date'), width: 90 }, { header: t('pdf.entries'), align: 'right' }, { header: t('common.amount'), align: 'right', width: 120 }],
        rows: d.by_date.map((r) => [pdfDate(r.date), pdfQty(r.count), pdfMoney(r.total)]),
        foot: [t('pdf.grandTotal'), pdfQty(d.by_date.reduce((s, r) => s + r.count, 0)), pdfMoney(d.total)],
      },
      {
        heading: t('reports.categoryWise'),
        columns: [{ header: t('expenses.category') }, { header: t('pdf.entries'), align: 'right', width: 70 }, { header: t('common.amount'), align: 'right', width: 120 }],
        rows: d.by_category.map((c) => [localName(c), pdfQty(c.count), pdfMoney(c.total)]),
        foot: [t('pdf.grandTotal'), '', pdfMoney(d.total)],
      },
    ],
    summary: [[t('expenses.total'), pdfMoney(d.total), { strong: true, tone: 'red' }]],
  })
}

/** Customer khata: every entry with date, running balance, totals. */
export function customerLedgerPdf(customer, ledger, settings, typeLabel, showOpening) {
  const rows = []
  if (showOpening) rows.push({ style: 'subtotal', cells: [pdfDate(ledger.range.from), t('customers.openingRow'), '', '', '', pdfMoney(ledger.opening_balance)] })
  for (const e of ledger.entries) {
    const particulars = [typeLabel(e), e.payment_method && t(`payment.${e.payment_method}`), e.notes].filter(Boolean).join(' · ')
    rows.push([pdfDateTime(e.date), particulars, e.invoice_no || '', toNumber(e.debit) ? pdfMoney(e.debit) : '', toNumber(e.credit) ? pdfMoney(e.credit) : '', pdfMoney(e.balance)])
  }
  const due = toNumber(ledger.closing_balance)
  return downloadPdf({
    filename: `khata-${fileSlug(customer.name)}-${stamp()}.pdf`,
    title: barName(settings),
    subtitle: t('pdf.customerLedger'),
    meta: [
      [t('pdf.customer'), customer.name],
      [t('customers.mobile'), customer.mobile],
      [t('pdf.period'), pdfPeriod(ledger.range)],
    ],
    sections: [
      {
        columns: [
          { header: t('common.date'), width: 78 },
          { header: t('pdf.particulars') },
          { header: t('pdf.billNo'), width: 64 },
          { header: t('customers.debit'), align: 'right', width: 76 },
          { header: t('customers.credit'), align: 'right', width: 76 },
          { header: t('customers.balance'), align: 'right', width: 76 },
        ],
        rows,
        foot: ['', t('pdf.grandTotal'), '', pdfMoney(ledger.total_debit), pdfMoney(ledger.total_credit), pdfMoney(ledger.closing_balance)],
      },
    ],
    summary: [
      [t('customers.totalUdhari'), pdfMoney(ledger.total_debit)],
      [t('customers.paid'), pdfMoney(ledger.total_credit)],
      [t('customers.remaining'), pdfMoney(ledger.closing_balance), { strong: true, tone: due > 0 ? 'red' : 'green' }],
    ],
  })
}

/** Supplier khata: purchases and payments in date order. */
export function supplierLedgerPdf(supplier, ledger, settings, describe) {
  const entries = [...ledger.entries].reverse()
  const sum = (k) => entries.reduce((s, e) => s + toNumber(e[k]), 0)
  const due = toNumber(ledger.closing_balance)
  return downloadPdf({
    filename: `supplier-${fileSlug(supplier.name)}-${stamp()}.pdf`,
    title: barName(settings),
    subtitle: t('pdf.supplierLedger'),
    meta: [
      [t('pdf.supplier'), supplier.name],
      [t('customers.mobile'), supplier.mobile],
      [t('pdf.period'), entries.length ? pdfPeriod({ from: entries[0].date.slice(0, 10), to: entries[entries.length - 1].date.slice(0, 10) }) : t('pdf.allTime')],
    ],
    sections: [
      {
        columns: [
          { header: t('common.date'), width: 64 },
          { header: t('pdf.particulars') },
          { header: t('stock.invoiceNo'), width: 64 },
          { header: t('suppliers.types.purchase'), align: 'right', width: 76 },
          { header: t('suppliers.paid'), align: 'right', width: 76 },
          { header: t('suppliers.unpaid'), align: 'right', width: 76 },
        ],
        rows: entries.map((e) => [pdfDate(e.date), describe(e), e.invoice_no || '', toNumber(e.debit) ? pdfMoney(e.debit) : '', toNumber(e.credit) ? pdfMoney(e.credit) : '', pdfMoney(e.balance)]),
        foot: ['', t('pdf.grandTotal'), '', pdfMoney(sum('debit')), pdfMoney(sum('credit')), pdfMoney(ledger.closing_balance)],
      },
    ],
    summary: [
      [t('suppliers.totalPurchase'), pdfMoney(supplier.total_purchase)],
      [t('suppliers.paid'), pdfMoney(supplier.total_paid)],
      [t('suppliers.unpaid'), pdfMoney(ledger.closing_balance), { strong: true, tone: due > 0 ? 'red' : 'green' }],
    ],
  })
}

/** One bill (A5). */
export function billPdf(sale, settings) {
  return downloadPdf({
    filename: `bill-${sale.invoice_no}.pdf`,
    format: 'a5',
    title: barName(settings),
    subtitle: `${t('sales.bill')} ${sale.invoice_no}${sale.status === 'void' ? ` (${t('sales.cancelled')})` : ''}`,
    meta: [
      [t('common.date'), pdfDateTime(sale.sold_at)],
      [t('pdf.customer'), sale.customer ? `${sale.customer.name}${sale.customer.mobile ? ` (${sale.customer.mobile})` : ''}` : t('sales.walkIn')],
      [t('sales.paymentType'), t(`sales.${sale.payment_method}`)],
      [t('customers.address'), settings?.address],
    ],
    sections: [
      {
        columns: [
          { header: '#', align: 'right', width: 20 },
          { header: t('products.name') },
          { header: t('common.qty'), align: 'right', width: 34 },
          { header: t('sales.unitPrice'), align: 'right', width: 64 },
          { header: t('common.amount'), align: 'right', width: 72 },
        ],
        rows: sale.items.map((i, n) => [n + 1, i.product_name, pdfQty(i.quantity), pdfMoney(i.unit_price), pdfMoney(i.line_total)]),
        foot: ['', t('sales.total'), pdfQty(sale.total_qty), '', pdfMoney(sale.total_amount)],
      },
    ],
  })
}

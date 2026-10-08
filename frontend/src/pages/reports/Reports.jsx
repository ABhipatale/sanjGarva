import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { BarChart3, Boxes, FileSpreadsheet, HandCoins, Printer, Scale, Wallet } from 'lucide-react'
import clsx from 'clsx'
import PageHeader from '../../components/ui/PageHeader'
import PeriodFilter from '../../components/ui/PeriodFilter'
import Segmented from '../../components/ui/Segmented'
import Button from '../../components/ui/Button'
import DataTable from '../../components/ui/DataTable'
import { Card, CardHeader, StatCard } from '../../components/ui/Card'
import { StockBadge } from '../../components/ui/Badge'
import { EmptyState, QueryState, Skeleton } from '../../components/ui/States'
import BarChart from '../../components/BarChart'
import { reportApi } from '../../services/endpoints'
import { useToast } from '../../context/ToastContext'
import { formatDate, localName, money, num, percent, toNumber } from '../../utils/format'

const TABS = [
  { value: 'sales', icon: BarChart3 },
  { value: 'profit', icon: Scale },
  { value: 'stock', icon: Boxes },
  { value: 'udhari', icon: HandCoins },
  { value: 'expenses', icon: Wallet },
]

export default function Reports() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((x) => x.value === params.get('tab')) ? params.get('tab') : 'sales'
  const [period, setPeriod] = useState({ period: 'month' })

  return (
    <div className="space-y-3">
      <PageHeader title={t('reports.title')} />
      <div className="no-print">
        <Segmented
          scroll
          value={tab}
          onChange={(v) => setParams({ tab: v }, { replace: true })}
          options={TABS.map((x) => ({ value: x.value, label: t(`reports.${x.value}`), icon: x.icon }))}
        />
      </div>
      {tab !== 'stock' && <PeriodFilter value={period} onChange={setPeriod} />}
      {tab === 'sales' && <SalesReport period={period} />}
      {tab === 'profit' && <ProfitReport period={period} />}
      {tab === 'stock' && <StockReport />}
      {tab === 'udhari' && <UdhariReport period={period} />}
      {tab === 'expenses' && <ExpenseReport period={period} />}
    </div>
  )
}

function Toolbar({ exportType, period }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const doExport = async () => {
    setBusy(true)
    try {
      await reportApi.export(exportType, period?.period === 'all' ? {} : period)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex flex-wrap justify-end gap-2 no-print">
      <Button variant="secondary" size="sm" icon={Printer} onClick={() => window.print()}>{t('common.print')} / PDF</Button>
      {exportType && <Button variant="secondary" size="sm" icon={FileSpreadsheet} onClick={doExport} loading={busy}>{t('common.exportCsv')}</Button>}
    </div>
  )
}

function SalesReport({ period }) {
  const { t } = useTranslation()
  const [group, setGroup] = useState('day')
  const query = useQuery({ queryKey: ['reports', 'sales', period, group], queryFn: () => reportApi.sales({ ...period, group }).then((r) => r.data) })
  const label = (p) => (group === 'month' ? formatDate(`${p}-01`, { month: 'short', year: 'numeric' }) : formatDate(p, { day: 'numeric', month: 'short' }))

  return (
    <QueryState query={query} skeleton={<Skeleton className="h-64" />}>
      {(d) => (
        <div className="space-y-3">
          <Toolbar exportType="sales" period={period} />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label={t('reports.salesRevenue')} value={money(d.summary.sales)} sub={`${num(d.summary.transactions)} ${t('sales.transactions')}`} tone="brand" />
            <StatCard label={t('reports.grossProfit')} value={money(d.summary.gross_profit)} sub={`${t('reports.grossMargin')} ${percent(d.summary.gross_margin)}`} tone="green" />
            <StatCard label={t('sales.cash')} value={money(d.summary.cash)} sub={`${t('sales.other')}: ${money(d.summary.other)}`} />
            <StatCard label={t('sales.udhari')} value={money(d.summary.udhari)} sub={`${t('sales.totalQty')}: ${num(d.summary.qty)}`} tone="amber" />
          </div>
          <div className="flex items-center justify-between gap-3 no-print">
            <span className="text-[15px] font-semibold text-slate-600">{t('reports.groupBy')}</span>
            <Segmented className="w-64" value={group} onChange={setGroup} options={[{ value: 'day', label: t('reports.day') }, { value: 'week', label: t('reports.weekly') }, { value: 'month', label: t('reports.monthly') }]} />
          </div>
          {d.rows.length === 0 ? (
            <EmptyState icon={BarChart3} title={t('sales.noSalesPeriod')} />
          ) : (
            <>
              {d.rows.length > 1 && (
                <Card className="p-4 sm:p-5 no-print">
                  <BarChart data={d.rows.slice(-14).map((r) => ({ label: label(r.period), short: label(r.period), value: r.sales }))} />
                </Card>
              )}
              <DataTable
                rows={d.rows}
                rowKey={(r) => r.period}
                columns={[
                  { key: 'period', header: t('reports.period'), render: (r) => <b>{label(r.period)}</b> },
                  { key: 'tx', header: t('sales.transactions'), align: 'right', render: (r) => num(r.transactions) },
                  { key: 'qty', header: t('common.qty'), align: 'right', render: (r) => num(r.qty) },
                  { key: 'cash', header: t('sales.cash'), align: 'right', render: (r) => money(r.cash) },
                  { key: 'udhari', header: t('sales.udhari'), align: 'right', render: (r) => money(r.udhari) },
                  { key: 'sales', header: t('reports.salesRevenue'), align: 'right', render: (r) => <b>{money(r.sales)}</b> },
                  { key: 'cost', header: t('sales.cost'), align: 'right', render: (r) => money(r.cost) },
                  { key: 'profit', header: t('sales.profit'), align: 'right', render: (r) => <b className="text-emerald-700">{money(r.profit)}</b> },
                ]}
                renderCard={(r) => (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{label(r.period)}</p>
                      <p className="text-sm text-slate-500">{num(r.transactions)} {t('sales.transactions')} · {num(r.qty)} {t('common.qty')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-extrabold tabular-nums">{money(r.sales)}</p>
                      <p className="text-sm font-semibold text-emerald-700">{t('sales.profit')} {money(r.profit)}</p>
                    </div>
                  </div>
                )}
              />
              {d.top_products.length > 0 && (
                <Card>
                  <CardHeader title={t('reports.topProducts')} />
                  <ol className="divide-y divide-slate-100 p-2 sm:p-3">
                    {d.top_products.map((p, i) => (
                      <li key={p.product_id} className="flex items-center gap-3 px-2 py-2.5">
                        <span className="flex size-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">{i + 1}</span>
                        <span className="flex-1 truncate font-semibold">{p.product_name}</span>
                        <span className="text-sm text-slate-500">{num(p.qty)}</span>
                        <span className="w-24 text-right font-bold tabular-nums">{money(p.sales)}</span>
                      </li>
                    ))}
                  </ol>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </QueryState>
  )
}

function ProfitReport({ period }) {
  const { t } = useTranslation()
  const query = useQuery({ queryKey: ['reports', 'profit', period], queryFn: () => reportApi.profitLoss(period).then((r) => r.data) })
  return (
    <QueryState query={query} skeleton={<Skeleton className="h-80" />}>
      {(d) => {
        const net = toNumber(d.net_profit)
        const line = (label, value, cls, sign) => (
          <div className={clsx('flex items-center justify-between px-5 py-3.5', cls)}>
            <span className="text-[16px]">{label}</span>
            <span className="text-xl font-extrabold tabular-nums">{sign}{money(value)}</span>
          </div>
        )
        return (
          <div className="space-y-3">
            <Toolbar period={period} />
            <Card className="print-area overflow-hidden">
              <div className="divide-y divide-slate-100">
                {line(t('reports.salesRevenue'), d.revenue, 'font-semibold')}
                {line(t('reports.cogs'), d.cogs, 'text-slate-600', '− ')}
                {line(`= ${t('reports.grossProfit')} (${percent(d.gross_margin)})`, d.gross_profit, 'bg-emerald-50 font-bold text-emerald-800')}
                {line(t('reports.expenses_total'), d.expenses, 'text-slate-600', '− ')}
                <div className={clsx('flex items-center justify-between px-5 py-5', net < 0 ? 'bg-rose-600 text-white' : 'bg-linear-to-r from-brand-700 to-brand-900 text-white')}>
                  <span className="text-lg font-bold">= {net < 0 ? t('reports.netLoss') : t('reports.netProfit')}</span>
                  <span className="text-3xl font-extrabold tabular-nums">{money(d.net_profit)}</span>
                </div>
              </div>
            </Card>
            <p className="text-center text-sm text-slate-500">{t('reports.netMargin')}: {percent(d.net_margin)} · {num(d.transactions)} {t('sales.transactions')}</p>
            {d.expenses_by_category.length > 0 && (
              <Card>
                <CardHeader title={`${t('reports.expenses_total')} · ${t('reports.categoryWise')}`} />
                <ul className="divide-y divide-slate-100 p-2 sm:p-3">
                  {d.expenses_by_category.map((c) => (
                    <li key={c.category_id} className="flex justify-between px-2 py-2.5">
                      <span className="font-semibold">{localName(c)}</span>
                      <span className="font-bold tabular-nums text-rose-600">{money(c.total)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )
      }}
    </QueryState>
  )
}

function StockReport() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const query = useQuery({ queryKey: ['reports', 'stock'], queryFn: () => reportApi.stock().then((r) => r.data) })
  return (
    <QueryState query={query} skeleton={<Skeleton className="h-80" />}>
      {(d) => {
        const items = d.items.filter((p) => p.is_active && (filter === 'all' || p.shop_status === filter || p.store_status === filter))
        return (
          <div className="space-y-3">
            <Toolbar exportType="stock" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label={t('stock.storeStock')} value={num(d.totals.store.qty)} sub={money(d.totals.store.value)} tone="brand" />
              <StatCard label={t('stock.shopStock')} value={num(d.totals.shop.qty)} sub={money(d.totals.shop.value)} tone="blue" />
              <StatCard label={t('stock.stockValue')} value={money(d.totals.value)} sub={`${num(d.totals.qty)} ${t('common.units')}`} tone="green" />
              <StatCard label={`${t('stock.lowStock')} / ${t('stock.outOfStock')}`} value={`${num(d.totals.shop.low)} / ${num(d.totals.shop.out)}`} sub={t('stock.shop')} tone="amber" />
            </div>
            <Segmented
              scroll
              value={filter}
              onChange={setFilter}
              options={[{ value: 'all', label: t('common.all') }, { value: 'low', label: `🟠 ${t('stock.lowStock')}` }, { value: 'out', label: `🔴 ${t('stock.outOfStock')}` }]}
            />
            <DataTable
              rows={items}
              onRowClick={() => navigate('/stock/shop')}
              columns={[
                { key: 'name', header: t('products.name'), render: (p) => <div><b>{localName(p)}</b><p className="text-sm text-slate-500">{[p.bottle_size, localName(p, 'category')].filter(Boolean).join(' · ')}</p></div> },
                { key: 'store', header: t('stock.store'), align: 'right', render: (p) => <span className="inline-flex items-center gap-2">{num(p.store_qty)} <StockBadge status={p.store_status} /></span> },
                { key: 'shop', header: t('stock.shop'), align: 'right', render: (p) => <span className="inline-flex items-center gap-2">{num(p.shop_qty)} <StockBadge status={p.shop_status} /></span> },
                { key: 'total', header: t('reports.totalStock'), align: 'right', render: (p) => <b>{num(p.total_qty)}</b> },
                { key: 'cost', header: t('products.avgCost'), align: 'right', render: (p) => money(p.avg_cost) },
                { key: 'value', header: t('stock.stockValue'), align: 'right', render: (p) => <b>{money(p.total_value)}</b> },
              ]}
              renderCard={(p) => (
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{localName(p)}</p>
                    <p className="text-sm text-slate-500">{t('stock.store')} {num(p.store_qty)} · {t('stock.shop')} {num(p.shop_qty)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold tabular-nums">{money(p.total_value)}</p>
                    <StockBadge status={p.shop_status} />
                  </div>
                </div>
              )}
            />
          </div>
        )
      }}
    </QueryState>
  )
}

function UdhariReport({ period }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const query = useQuery({ queryKey: ['reports', 'udhari', period], queryFn: () => reportApi.udhari(period).then((r) => r.data) })
  return (
    <QueryState query={query} skeleton={<Skeleton className="h-80" />}>
      {(d) => (
        <div className="space-y-3">
          <Toolbar exportType="udhari" period={period} />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label={t('reports.totalOutstanding')} value={money(d.total_outstanding)} sub={t('dashboard.customersWithDues', { count: d.customers_with_dues })} tone="red" />
            <StatCard label={t('reports.udhariGiven')} value={money(d.udhari_given)} tone="amber" />
            <StatCard label={t('reports.paymentsReceived')} value={money(d.payments_received)} tone="green" />
            <StatCard label={t('customers.remaining')} value={money(toNumber(d.udhari_given) - toNumber(d.payments_received))} sub={t('reports.period')} />
          </div>
          <h3 className="pt-2 text-[17px] font-bold">{t('reports.customerWise')}</h3>
          {d.customers.length === 0 ? (
            <EmptyState title={t('customers.noDues')} />
          ) : (
            <DataTable
              rows={d.customers}
              onRowClick={(c) => navigate(`/customers/${c.id}`)}
              columns={[
                { key: 'name', header: t('customers.name'), render: (c) => <b>{c.name}</b> },
                { key: 'mobile', header: t('customers.mobile'), render: (c) => c.mobile || '–' },
                { key: 'debit', header: t('customers.totalUdhari'), align: 'right', render: (c) => money(c.total_debit) },
                { key: 'credit', header: t('customers.paid'), align: 'right', render: (c) => <span className="text-emerald-700">{money(c.total_credit)}</span> },
                { key: 'balance', header: t('customers.remaining'), align: 'right', render: (c) => <b className="text-rose-600">{money(c.balance)}</b> },
              ]}
              renderCard={(c) => (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">{c.name}</p>
                    <p className="text-sm text-slate-500">{c.mobile}</p>
                  </div>
                  <p className="text-lg font-extrabold tabular-nums text-rose-600">{money(c.balance)}</p>
                </div>
              )}
            />
          )}
        </div>
      )}
    </QueryState>
  )
}

function ExpenseReport({ period }) {
  const { t } = useTranslation()
  const query = useQuery({ queryKey: ['reports', 'expenses', period], queryFn: () => reportApi.expenses(period).then((r) => r.data) })
  return (
    <QueryState query={query} skeleton={<Skeleton className="h-80" />}>
      {(d) => (
        <div className="space-y-3">
          <Toolbar exportType="expenses" period={period} />
          <StatCard label={t('expenses.total')} value={money(d.total)} tone="red" />
          {d.by_category.length === 0 ? (
            <EmptyState icon={Wallet} title={t('expenses.empty')} />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              <Card>
                <CardHeader title={t('reports.categoryWise')} />
                <ul className="divide-y divide-slate-100 p-2 sm:p-3">
                  {d.by_category.map((c) => (
                    <li key={c.category_id} className="flex justify-between px-2 py-2.5">
                      <span className="font-semibold">{localName(c)} <span className="text-sm font-normal text-slate-400">({c.count})</span></span>
                      <span className="font-bold tabular-nums">{money(c.total)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card>
                <CardHeader title={t('reports.dateWise')} />
                <ul className="divide-y divide-slate-100 p-2 sm:p-3">
                  {d.by_date.map((r) => (
                    <li key={r.date} className="flex justify-between px-2 py-2.5">
                      <span className="font-semibold">{formatDate(r.date)}</span>
                      <span className="font-bold tabular-nums">{money(r.total)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </div>
      )}
    </QueryState>
  )
}

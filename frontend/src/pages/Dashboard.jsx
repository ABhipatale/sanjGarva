import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ArrowRightLeft, Banknote, ChevronRight, HandCoins, PackagePlus, PackageX, Receipt, ShoppingCart, TrendingUp, TriangleAlert, UserPlus, Wallet, Wine,
} from 'lucide-react'
import clsx from 'clsx'
import { Card, CardHeader, StatCard } from '../components/ui/Card'
import { PaymentBadge, StockBadge } from '../components/ui/Badge'
import { ErrorState, Skeleton } from '../components/ui/States'
import BarChart from '../components/BarChart'
import SaleDetailModal from '../components/SaleDetailModal'
import { dashboardApi } from '../services/endpoints'
import { useAuth } from '../context/AuthContext'
import { formatDate, formatTime, localName, money, num, toNumber } from '../utils/format'

function greetingKey() {
  const h = new Date().getHours()
  return h < 12 ? 'greeting.morning' : h < 17 ? 'greeting.afternoon' : 'greeting.evening'
}

const QUICK = [
  { to: '/sales/new', icon: ShoppingCart, key: 'quick.newSale', className: 'bg-linear-to-br from-brand-600 to-brand-800 text-white' },
  { to: '/stock/add', icon: PackagePlus, key: 'quick.addStock', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  { to: '/stock/transfer', icon: ArrowRightLeft, key: 'quick.transfer', className: 'bg-sky-50 text-sky-800 ring-sky-200' },
  { to: '/customers?receive=1', icon: HandCoins, key: 'quick.receiveUdhari', className: 'bg-amber-50 text-amber-800 ring-amber-200' },
  { to: '/customers?new=1', icon: UserPlus, key: 'quick.customer', className: 'bg-white text-slate-800 ring-slate-200' },
  { to: '/expenses?new=1', icon: Wallet, key: 'quick.expense', className: 'bg-rose-50 text-rose-800 ring-rose-200' },
]

export default function Dashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [saleId, setSaleId] = useState(null)
  const query = useQuery({ queryKey: ['dashboard'], queryFn: () => dashboardApi.get().then((r) => r.data), refetchInterval: 60_000 })
  const d = query.data

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[15px] font-medium text-slate-500">{formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="text-2xl font-extrabold text-slate-900">
          {t(greetingKey())}, {user?.name} 👋
        </h1>
      </div>

      {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}

      {/* Today's business hero */}
      <section aria-label={t('dashboard.todaysBusiness')} className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-800 via-brand-900 to-brand-950 p-5 text-white shadow-lift">
        <div className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-gold-400/20 blur-2xl" aria-hidden />
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-200">{t('dashboard.todaysBusiness')}</p>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[15px] text-brand-100">{t('dashboard.todaysSales')}</p>
            {d ? <p className="text-3xl font-extrabold tabular-nums sm:text-4xl">{money(d.today.sales)}</p> : <Skeleton className="mt-1 h-10 w-32 bg-white/20" />}
          </div>
          <div>
            <p className="text-[15px] text-brand-100">{t('dashboard.netProfit')}</p>
            {d ? (
              <p className={clsx('text-3xl font-extrabold tabular-nums sm:text-4xl', toNumber(d.today.net_profit) < 0 ? 'text-rose-300' : 'text-gold-300')}>
                {money(d.today.net_profit)}
              </p>
            ) : (
              <Skeleton className="mt-1 h-10 w-28 bg-white/20" />
            )}
          </div>
        </div>
        {d && (
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
            <div>
              <p className="text-xs text-brand-200">{t('dashboard.grossProfit')}</p>
              <p className="font-bold tabular-nums">{money(d.today.gross_profit)}</p>
            </div>
            <div>
              <p className="text-xs text-brand-200">{t('dashboard.transactions')}</p>
              <p className="font-bold tabular-nums">{num(d.today.transactions)}</p>
            </div>
            <div>
              <p className="text-xs text-brand-200">{t('dashboard.productsSold')}</p>
              <p className="font-bold tabular-nums">{num(d.today.qty)}</p>
            </div>
          </div>
        )}
      </section>

      {/* Money split */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {d ? (
          <>
            <StatCard label={t('dashboard.cash')} value={money(d.today.cash)} icon={Banknote} tone="green" to="/sales?payment_method=cash" />
            <StatCard label={t('dashboard.udhari')} value={money(d.today.udhari)} icon={HandCoins} tone="amber" to="/sales?payment_method=udhari" />
            <StatCard label={t('dashboard.expenses')} value={money(d.today.expenses)} icon={Wallet} tone="red" to="/expenses?period=today" />
            <StatCard
              label={t('dashboard.outstandingUdhari')}
              value={money(d.outstanding_udhari)}
              sub={t('dashboard.customersWithDues', { count: d.customers_with_dues })}
              icon={Receipt}
              tone="brand"
              to="/customers?dues=1"
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)
        )}
      </div>

      {/* Quick actions */}
      <section aria-labelledby="quick-actions">
        <h2 id="quick-actions" className="mb-2.5 text-[17px] font-bold text-slate-900">
          {t('dashboard.quickActions')}
        </h2>
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
          {QUICK.map(({ to, icon: Icon, key, className }) => (
            <Link
              key={key}
              to={to}
              className={clsx(
                'flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl p-3 text-center text-[14px] font-bold leading-tight shadow-card ring-1 transition active:scale-[0.97]',
                className,
              )}
            >
              <Icon className="size-7" aria-hidden />
              {t(key)}
            </Link>
          ))}
        </div>
      </section>

      {/* Stock alerts */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={`${t('dashboard.lowStock')} · ${t('dashboard.inShop')}`}
          value={d ? num(d.stock.shop.low) : '–'}
          sub={d ? `${t('dashboard.inStore')}: ${num(d.stock.store.low)}` : null}
          icon={TriangleAlert}
          tone="amber"
          to="/stock/shop?status=low"
        />
        <StatCard
          label={`${t('dashboard.outOfStock')} · ${t('dashboard.inShop')}`}
          value={d ? num(d.stock.shop.out) : '–'}
          sub={d ? `${t('dashboard.inStore')}: ${num(d.stock.store.out)}` : null}
          icon={PackageX}
          tone="red"
          to="/stock/shop?status=out"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('dashboard.last7Days')} icon={TrendingUp} />
          <div className="p-4 sm:p-5">
            {d ? (
              <BarChart
                ariaLabel={t('dashboard.last7Days')}
                data={d.last_7_days.map((x) => ({
                  label: formatDate(x.date, { weekday: 'short', day: 'numeric', month: 'short' }),
                  short: formatDate(x.date, { weekday: 'short' }),
                  value: x.sales,
                }))}
              />
            ) : (
              <Skeleton className="h-40" />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title={t('dashboard.lowStock')}
            icon={Wine}
            action={
              <Link to="/stock/shop?status=attention" className="text-sm font-semibold text-brand-700">
                {t('common.seeAll')}
              </Link>
            }
          />
          <div className="p-2 sm:p-3">
            {!d ? (
              <Skeleton className="m-2 h-40" />
            ) : d.low_stock_items.length === 0 ? (
              <p className="px-3 py-10 text-center text-[15px] font-semibold text-emerald-700">{t('dashboard.allGood')}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {d.low_stock_items.map((p) => (
                  <li key={p.id}>
                    <Link to={`/stock/transfer?product=${p.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">{localName(p)}</p>
                        <p className="text-sm text-slate-500">
                          {t('stock.store')}: {num(p.store_qty)}
                        </p>
                      </div>
                      <span className="text-lg font-extrabold tabular-nums">{num(p.shop_qty)}</span>
                      <StockBadge status={p.status} />
                      <ChevronRight className="size-4 text-slate-400" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={t('dashboard.recentSales')}
          icon={Receipt}
          action={
            <Link to="/sales" className="text-sm font-semibold text-brand-700">
              {t('common.seeAll')}
            </Link>
          }
        />
        <div className="p-2 sm:p-3">
          {!d ? (
            <Skeleton className="m-2 h-32" />
          ) : d.recent_sales.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-[15px] font-medium text-slate-500">{t('dashboard.noSalesToday')}</p>
              <Link to="/sales/new" className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-700 px-4 font-semibold text-white">
                <ShoppingCart className="size-5" aria-hidden />
                {t('quick.newSale')}
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.recent_sales.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => setSaleId(s.id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{s.customer_name || t('sales.walkIn')}</p>
                      <p className="text-sm text-slate-500">
                        {s.invoice_no} · {formatTime(s.sold_at)} · {t('sales.items', { count: s.total_qty })}
                      </p>
                    </div>
                    <PaymentBadge method={s.payment_method} />
                    <span className="w-24 text-right font-bold tabular-nums">{money(s.total_amount)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <SaleDetailModal saleId={saleId} onClose={() => setSaleId(null)} />
    </div>
  )
}

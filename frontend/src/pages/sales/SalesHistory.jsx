import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Banknote, HandCoins, Plus, Receipt, ShoppingBag, TrendingUp } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import PeriodFilter from '../../components/ui/PeriodFilter'
import Segmented from '../../components/ui/Segmented'
import Button from '../../components/ui/Button'
import DataTable from '../../components/ui/DataTable'
import Pagination from '../../components/ui/Pagination'
import { StatCard } from '../../components/ui/Card'
import { Badge, PaymentBadge } from '../../components/ui/Badge'
import { EmptyState, QueryState } from '../../components/ui/States'
import SaleDetailModal from '../../components/SaleDetailModal'
import { saleApi } from '../../services/endpoints'
import { formatDateTime, money, num, percent } from '../../utils/format'

export default function SalesHistory() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const [period, setPeriod] = useState({ period: params.get('period') || 'today' })
  const [method, setMethod] = useState(params.get('payment_method') || '')
  const [page, setPage] = useState(1)
  const [saleId, setSaleId] = useState(null)

  const query = useQuery({
    queryKey: ['sales', 'list', period, method, page],
    queryFn: () => saleApi.list({ ...period, payment_method: method, page }),
    placeholderData: keepPreviousData,
  })
  const summary = query.data?.meta?.summary

  const change = (fn) => (v) => {
    fn(v)
    setPage(1)
  }

  return (
    <div>
      <PageHeader title={t('sales.history')} actions={<Button to="/sales/new" icon={Plus}>{t('sales.newSale')}</Button>} />

      <div className="space-y-3">
        <PeriodFilter value={period} onChange={change(setPeriod)} />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label={t('sales.total')} value={summary ? money(summary.sales) : '–'} sub={summary && `${num(summary.transactions)} ${t('sales.transactions')}`} icon={Receipt} tone="brand" />
          <StatCard label={t('sales.profit')} value={summary ? money(summary.gross_profit) : '–'} sub={summary && `${t('sales.grossMargin')} ${percent(summary.gross_margin)}`} icon={TrendingUp} tone="green" />
          <StatCard label={t('sales.cash')} value={summary ? money(summary.cash) : '–'} sub={summary && `${t('sales.other')}: ${money(summary.other)}`} icon={Banknote} />
          <StatCard label={t('sales.udhari')} value={summary ? money(summary.udhari) : '–'} sub={summary && `${t('sales.totalQty')}: ${num(summary.qty)}`} icon={HandCoins} tone="amber" />
        </div>

        <Segmented
          scroll
          value={method}
          onChange={change(setMethod)}
          options={[
            { value: '', label: t('common.all') },
            { value: 'cash', label: t('sales.cash') },
            { value: 'udhari', label: t('sales.udhari') },
            { value: 'other', label: t('sales.other') },
          ]}
        />

        <QueryState
          query={query}
          isEmpty={(d) => d.data.length === 0}
          empty={<EmptyState icon={ShoppingBag} title={t('sales.noSalesPeriod')} action={<Button to="/sales/new" icon={Plus}>{t('sales.newSale')}</Button>} />}
        >
          {(d) => (
            <>
              <DataTable
                rows={d.data}
                onRowClick={(s) => setSaleId(s.id)}
                columns={[
                  { key: 'invoice_no', header: t('sales.invoice'), render: (s) => <span className="font-semibold">{s.invoice_no}</span> },
                  { key: 'sold_at', header: t('common.date'), render: (s) => formatDateTime(s.sold_at) },
                  { key: 'customer', header: t('sales.customer'), render: (s) => s.customer?.name || <span className="text-slate-400">{t('sales.walkIn')}</span> },
                  { key: 'method', header: t('sales.paymentType'), render: (s) => (s.status === 'void' ? <Badge tone="red">{t('sales.cancelled')}</Badge> : <PaymentBadge method={s.payment_method} />) },
                  { key: 'qty', header: t('common.qty'), align: 'right', render: (s) => num(s.total_qty) },
                  { key: 'profit', header: t('sales.profit'), align: 'right', render: (s) => <span className="text-emerald-700">{money(s.profit)}</span> },
                  { key: 'total', header: t('common.total'), align: 'right', render: (s) => <span className={s.status === 'void' ? 'text-slate-400 line-through' : 'font-bold'}>{money(s.total_amount)}</span> },
                ]}
                renderCard={(s) => (
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-900">{s.customer?.name || t('sales.walkIn')}</p>
                      <p className="text-sm text-slate-500">
                        {s.invoice_no} · {formatDateTime(s.sold_at)} · {t('sales.items', { count: s.total_qty })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={s.status === 'void' ? 'font-bold text-slate-400 line-through' : 'text-lg font-extrabold tabular-nums'}>{money(s.total_amount)}</p>
                      {s.status === 'void' ? <Badge tone="red">{t('sales.cancelled')}</Badge> : <PaymentBadge method={s.payment_method} />}
                    </div>
                  </div>
                )}
              />
              <Pagination meta={d.meta} onChange={setPage} />
            </>
          )}
        </QueryState>
      </div>

      <SaleDetailModal saleId={saleId} onClose={() => setSaleId(null)} />
    </div>
  )
}

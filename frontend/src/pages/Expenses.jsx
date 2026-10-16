import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Home, Plus, Store, Wallet } from 'lucide-react'
import clsx from 'clsx'
import PageHeader from '../components/ui/PageHeader'
import PeriodFilter from '../components/ui/PeriodFilter'
import Button from '../components/ui/Button'
import Segmented from '../components/ui/Segmented'
import DataTable from '../components/ui/DataTable'
import Pagination from '../components/ui/Pagination'
import { Card } from '../components/ui/Card'
import { EmptyState, QueryState } from '../components/ui/States'
import ExpenseFormModal from '../components/ExpenseFormModal'
import { expenseApi } from '../services/endpoints'
import { formatDate, localName, money, toNumber } from '../utils/format'

export default function Expenses() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const [kind, setKindState] = useState(params.get('kind') === 'home' ? 'home' : 'bar')
  const [period, setPeriod] = useState({ period: params.get('period') || 'month' })
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(params.get('new') === '1' ? { expense: null } : null)

  useEffect(() => {
    if (params.get('new')) setParams({}, { replace: true })
  }, [params, setParams])

  const setKind = (k) => {
    setKindState(k)
    setPage(1)
  }
  const isHome = kind === 'home'

  const query = useQuery({
    queryKey: ['expenses', kind, period, page],
    queryFn: () => expenseApi.list({ ...period, page, kind }),
    placeholderData: keepPreviousData,
  })
  const summary = query.data?.meta?.summary
  const max = Math.max(1, ...(summary?.by_category || []).map((c) => toNumber(c.total)))

  return (
    <div className="space-y-3">
      <PageHeader title={t('expenses.title')} actions={<Button icon={Plus} onClick={() => setModal({ expense: null })}>{isHome ? t('expenses.addHome') : t('expenses.add')}</Button>} />
      <Segmented
        size="lg"
        value={kind}
        onChange={setKind}
        ariaLabel={t('expenses.title')}
        options={[
          { value: 'bar', label: t('expenses.barTab'), icon: Store },
          { value: 'home', label: t('expenses.homeTab'), icon: Home },
        ]}
      />
      <PeriodFilter value={period} onChange={(v) => { setPeriod(v); setPage(1) }} />

      {isHome && (
        <Card className="p-4 sm:p-5">
          <dl className="space-y-2 text-[15px]">
            <div className="flex justify-between">
              <dt className="font-semibold text-slate-600">{t('expenses.barProfit')}</dt>
              <dd className="font-bold tabular-nums">{summary?.bar_net_profit != null ? money(summary.bar_net_profit) : '–'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-semibold text-slate-600">− {t('expenses.lessHome')}</dt>
              <dd className="font-bold tabular-nums text-amber-700">{summary ? money(summary.total) : '–'}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-slate-200 pt-2">
              <dt className="font-extrabold text-slate-900">{t('expenses.afterHome')}</dt>
              <dd className={clsx('text-3xl font-extrabold tabular-nums', toNumber(summary?.after_home) < 0 ? 'text-rose-600' : 'text-emerald-700')}>
                {summary?.after_home != null ? money(summary.after_home) : '–'}
              </dd>
            </div>
          </dl>
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{t('expenses.homeNote')}</p>
        </Card>
      )}

      <Card className="p-4 sm:p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-[15px] font-semibold text-slate-600">{isHome ? t('expenses.homeTotal') : t('expenses.total')}</p>
          <p className={clsx('text-3xl font-extrabold tabular-nums', isHome ? 'text-amber-700' : 'text-rose-600')}>{summary ? money(summary.total) : '–'}</p>
        </div>
        {summary?.by_category?.length > 0 && (
          <ul className="mt-4 space-y-2.5" aria-label={t('expenses.byCategory')}>
            {summary.by_category.map((c) => (
              <li key={c.category_id}>
                <div className="flex justify-between text-[15px]">
                  <span className="font-semibold text-slate-700">{localName(c)}</span>
                  <span className="font-bold tabular-nums">{money(c.total)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={clsx('h-full rounded-full', isHome ? 'bg-amber-400' : 'bg-rose-400')} style={{ width: `${(toNumber(c.total) / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <QueryState
        query={query}
        isEmpty={(d) => d.data.length === 0}
        empty={
          <EmptyState
            icon={isHome ? Home : Wallet}
            title={isHome ? t('expenses.emptyHome') : t('expenses.empty')}
            action={<Button icon={Plus} onClick={() => setModal({ expense: null })}>{isHome ? t('expenses.addHome') : t('expenses.addFirst')}</Button>}
          />
        }
      >
        {(d) => (
          <>
            <DataTable
              rows={d.data}
              onRowClick={(e) => setModal({ expense: e })}
              columns={[
                { key: 'date', header: t('common.date'), render: (e) => formatDate(e.expense_date) },
                { key: 'category', header: t('expenses.category'), render: (e) => <b>{localName(e.category)}</b> },
                { key: 'description', header: t('expenses.description'), render: (e) => e.description || '–' },
                { key: 'method', header: t('customers.paymentMethod'), render: (e) => t(`payment.${e.payment_method}`) },
                { key: 'amount', header: t('common.amount'), align: 'right', render: (e) => <b className="text-rose-600">{money(e.amount)}</b> },
              ]}
              renderCard={(e) => (
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900">{localName(e.category)}</p>
                    <p className="truncate text-sm text-slate-500">
                      {formatDate(e.expense_date)}
                      {e.description && ` · ${e.description}`}
                    </p>
                  </div>
                  <p className="text-lg font-extrabold tabular-nums text-rose-600">{money(e.amount)}</p>
                </div>
              )}
            />
            <Pagination meta={d.meta} onChange={setPage} />
          </>
        )}
      </QueryState>

      <ExpenseFormModal open={!!modal} expense={modal?.expense} kind={kind} onClose={() => setModal(null)} />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { HandCoins, UserPlus, Users } from 'lucide-react'
import clsx from 'clsx'
import PageHeader from '../../components/ui/PageHeader'
import SearchInput from '../../components/ui/SearchInput'
import Segmented from '../../components/ui/Segmented'
import Button from '../../components/ui/Button'
import Pagination from '../../components/ui/Pagination'
import { StatCard } from '../../components/ui/Card'
import { EmptyState, QueryState } from '../../components/ui/States'
import CustomerFormModal from '../../components/CustomerFormModal'
import ReceivePaymentModal from '../../components/ReceivePaymentModal'
import { customerApi } from '../../services/endpoints'
import { useDebounce } from '../../hooks/useDebounce'
import { initials, money, num, toNumber } from '../../utils/format'

export default function Customers() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(params.get('dues') ? 'dues' : 'all')
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(params.get('new') === '1')
  const [receiving, setReceiving] = useState(params.get('receive') === '1')
  const term = useDebounce(search)

  // Quick actions open dialogs via ?new=1 / ?receive=1; clear the flag so back/refresh doesn't reopen.
  useEffect(() => {
    if (params.get('new') || params.get('receive')) setParams({}, { replace: true })
  }, [params, setParams])

  const query = useQuery({
    queryKey: ['customers', 'list', term, filter, page],
    queryFn: ({ signal }) => customerApi.list({ search: term, with_dues: filter === 'dues' ? 1 : undefined, sort: filter === 'dues' ? 'balance' : 'name', page }, { signal }),
    placeholderData: keepPreviousData,
  })
  const summary = query.data?.meta?.summary

  return (
    <div className="space-y-3">
      <PageHeader
        title={t('customers.title')}
        actions={
          <>
            <Button variant="gold" icon={HandCoins} onClick={() => setReceiving(true)}>
              <span className="hidden sm:inline">{t('customers.receivePayment')}</span>
            </Button>
            <Button icon={UserPlus} onClick={() => setAdding(true)}>
              <span className="hidden sm:inline">{t('customers.add')}</span>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label={t('reports.totalOutstanding')} value={summary ? money(summary.total_outstanding) : '–'} icon={HandCoins} tone="red" />
        <StatCard label={t('customers.withDues')} value={summary ? `${num(summary.customers_with_dues)} / ${num(summary.customers)}` : '–'} icon={Users} tone="brand" />
      </div>

      <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder={t('customers.searchPlaceholder')} />
      <Segmented
        value={filter}
        onChange={(v) => { setFilter(v); setPage(1) }}
        options={[
          { value: 'all', label: t('common.all') },
          { value: 'dues', label: t('customers.withDues') },
        ]}
      />

      <QueryState
        query={query}
        isEmpty={(d) => d.data.length === 0}
        empty={
          <EmptyState
            icon={Users}
            title={search ? t('common.noResults') : filter === 'dues' ? t('customers.noDues') : t('customers.empty')}
            action={!search && filter === 'all' && <Button icon={UserPlus} onClick={() => setAdding(true)}>{t('customers.addFirst')}</Button>}
          />
        }
      >
        {(d) => (
          <>
            <ul className="grid gap-2.5 md:grid-cols-2">
              {d.data.map((c) => {
                const due = toNumber(c.balance)
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/customers/${c.id}`)}
                      className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-card ring-1 ring-slate-200/60 transition active:scale-[0.99]"
                    >
                      <span className={clsx('flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-bold', due > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700')}>
                        {initials(c.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[17px] font-bold text-slate-900">{c.name}</span>
                        <span className="block text-sm text-slate-500">{c.mobile || '—'}</span>
                      </span>
                      <span className="text-right">
                        <span className={clsx('block text-lg font-extrabold tabular-nums', due > 0 ? 'text-rose-600' : due < 0 ? 'text-sky-700' : 'text-emerald-600')}>{money(due)}</span>
                        <span className="block text-xs font-medium text-slate-500">{due > 0 ? t('customers.remaining') : t('customers.noDues')}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <Pagination meta={d.meta} onChange={setPage} />
          </>
        )}
      </QueryState>

      <CustomerFormModal open={adding} onClose={() => setAdding(false)} onSaved={(c) => { setAdding(false); navigate(`/customers/${c.id}`) }} />
      <ReceivePaymentModal open={receiving} onClose={() => setReceiving(false)} />
    </div>
  )
}

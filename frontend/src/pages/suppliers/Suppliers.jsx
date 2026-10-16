import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Banknote, Plus, Truck } from 'lucide-react'
import clsx from 'clsx'
import PageHeader from '../../components/ui/PageHeader'
import SearchInput from '../../components/ui/SearchInput'
import Segmented from '../../components/ui/Segmented'
import Button from '../../components/ui/Button'
import Pagination from '../../components/ui/Pagination'
import { StatCard } from '../../components/ui/Card'
import { EmptyState, QueryState } from '../../components/ui/States'
import SupplierFormModal from '../../components/SupplierFormModal'
import { supplierApi } from '../../services/endpoints'
import { useDebounce } from '../../hooks/useDebounce'
import { initials, money, toNumber } from '../../utils/format'

export default function Suppliers() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const term = useDebounce(search)

  const query = useQuery({
    queryKey: ['suppliers', 'list', term, filter, page],
    queryFn: ({ signal }) => supplierApi.list({ search: term, with_dues: filter === 'dues' ? 1 : undefined, sort: filter === 'dues' ? 'balance' : 'name', page }, { signal }),
    placeholderData: keepPreviousData,
  })
  const summary = query.data?.meta?.summary

  return (
    <div className="space-y-3">
      <PageHeader title={t('suppliers.title')} actions={<Button icon={Plus} onClick={() => setAdding(true)}>{t('suppliers.add')}</Button>} />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label={t('suppliers.unpaid')} value={summary ? money(summary.total_unpaid) : '–'} icon={Truck} tone="amber" />
        <StatCard
          label={t('suppliers.paid')}
          value={summary ? money(summary.total_paid) : '–'}
          sub={summary && `${t('suppliers.totalPurchase')}: ${money(summary.total_purchase)}`}
          icon={Banknote}
          tone="green"
        />
      </div>

      <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder={t('suppliers.searchPlaceholder')} />
      <Segmented
        value={filter}
        onChange={(v) => { setFilter(v); setPage(1) }}
        options={[
          { value: 'all', label: t('common.all') },
          { value: 'dues', label: t('suppliers.unpaid') },
        ]}
      />

      <QueryState
        query={query}
        isEmpty={(d) => d.data.length === 0}
        empty={
          <EmptyState
            icon={Truck}
            title={search ? t('common.noResults') : filter === 'dues' ? t('suppliers.noDues') : t('suppliers.empty')}
            action={!search && filter === 'all' && <Button icon={Plus} onClick={() => setAdding(true)}>{t('suppliers.addFirst')}</Button>}
          />
        }
      >
        {(d) => (
          <>
            <ul className="grid gap-2.5 md:grid-cols-2">
              {d.data.map((s) => {
                const due = toNumber(s.balance)
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/suppliers/${s.id}`)}
                      className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-card ring-1 ring-slate-200/60 transition active:scale-[0.99]"
                    >
                      <span className={clsx('flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-bold', due > 0 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700')}>
                        {initials(s.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[17px] font-bold text-slate-900">{s.name}</span>
                        <span className="block text-sm text-slate-500">
                          {t('suppliers.paid')}: <b className="text-emerald-700">{money(s.total_paid)}</b>
                        </span>
                      </span>
                      <span className="text-right">
                        <span className={clsx('block text-lg font-extrabold tabular-nums', due > 0 ? 'text-orange-600' : 'text-emerald-600')}>{money(due)}</span>
                        <span className="block text-xs font-medium text-slate-500">{due > 0 ? t('suppliers.unpaid') : t('suppliers.allPaid')}</span>
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

      <SupplierFormModal open={adding} onClose={() => setAdding(false)} onSaved={(s) => { setAdding(false); navigate(`/suppliers/${s.id}`) }} />
    </div>
  )
}

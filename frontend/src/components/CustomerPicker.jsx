import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronRight, UserPlus, UserRound } from 'lucide-react'
import clsx from 'clsx'
import Modal from './ui/Modal'
import SearchInput from './ui/SearchInput'
import Button from './ui/Button'
import { ListSkeleton, EmptyState } from './ui/States'
import CustomerFormModal from './CustomerFormModal'
import { customerApi } from '../services/endpoints'
import { useDebounce } from '../hooks/useDebounce'
import { initials, money, toNumber } from '../utils/format'

export default function CustomerPicker({ value, onChange, label, error, withDuesOnly = false }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const term = useDebounce(search)

  const query = useQuery({
    queryKey: ['customers', 'picker', term, withDuesOnly],
    queryFn: ({ signal }) => customerApi.list({ search: term, per_page: 40, with_dues: withDuesOnly ? 1 : undefined, sort: withDuesOnly ? 'balance' : 'name' }, { signal }),
    enabled: open,
    placeholderData: keepPreviousData,
  })

  const choose = (c) => {
    onChange(c)
    setOpen(false)
    setSearch('')
  }

  return (
    <div>
      {label && <p className="mb-1.5 text-[15px] font-semibold text-slate-700">{label}</p>}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          'flex min-h-16 w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left ring-1 ring-inset transition hover:ring-brand-400',
          error ? 'ring-rose-400' : 'ring-slate-300',
        )}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-800">
          {value ? initials(value.name) : <UserRound className="size-5" aria-hidden />}
        </span>
        {value ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-bold text-slate-900">{value.name}</span>
            <span className="block text-sm text-slate-500">
              {value.mobile ? `${value.mobile} · ` : ''}
              {t('customers.outstanding')}: {money(value.balance)}
            </span>
          </span>
        ) : (
          <span className="flex-1 text-[16px] font-medium text-slate-500">{t('common.selectCustomer')}</span>
        )}
        <ChevronRight className="size-5 text-slate-400" aria-hidden />
      </button>
      {error && <p className="mt-1.5 text-sm font-medium text-rose-600">{error}</p>}

      <Modal open={open} onClose={() => setOpen(false)} title={t('common.selectCustomer')} size="lg">
        <div className="flex gap-2">
          <SearchInput className="flex-1" value={search} onChange={setSearch} placeholder={t('customers.searchPlaceholder')} autoFocus />
          <Button variant="soft" size="icon" className="size-12" onClick={() => setAdding(true)} aria-label={t('customers.add')}>
            <UserPlus className="size-5" />
          </Button>
        </div>
        <div className="mt-3 min-h-[40vh]">
          {query.isPending ? (
            <ListSkeleton rows={6} />
          ) : !query.data?.data.length ? (
            <EmptyState
              title={search ? t('common.noResults') : t('customers.empty')}
              action={<Button icon={UserPlus} onClick={() => setAdding(true)}>{t('customers.add')}</Button>}
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {query.data.data.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => choose(c)} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-brand-50">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700">{initials(c.name)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-semibold text-slate-900">{c.name}</span>
                      {c.mobile && <span className="block text-sm text-slate-500">{c.mobile}</span>}
                    </span>
                    <span className={clsx('font-bold tabular-nums', toNumber(c.balance) > 0 ? 'text-rose-600' : 'text-emerald-600')}>{money(c.balance)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <CustomerFormModal open={adding} onClose={() => setAdding(false)} onSaved={(c) => { setAdding(false); choose(c) }} initialName={search} />
    </div>
  )
}

import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Banknote, ChevronRight, Plus, Truck } from 'lucide-react'
import clsx from 'clsx'
import Modal from './ui/Modal'
import SearchInput from './ui/SearchInput'
import Button from './ui/Button'
import { ListSkeleton, EmptyState } from './ui/States'
import SupplierFormModal from './SupplierFormModal'
import { supplierApi } from '../services/endpoints'
import { useDebounce } from '../hooks/useDebounce'
import { initials, money, toNumber } from '../utils/format'

/** Choose a supplier (or none). New suppliers can be added from inside the picker. */
export default function SupplierPicker({ value, onChange, label, error }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const term = useDebounce(search)

  const query = useQuery({
    queryKey: ['suppliers', 'picker', term],
    queryFn: ({ signal }) => supplierApi.list({ search: term, per_page: 40 }, { signal }),
    enabled: open,
    placeholderData: keepPreviousData,
  })

  const choose = (s) => {
    onChange(s)
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
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-800">
          {value ? initials(value.name) : <Truck className="size-5" aria-hidden />}
        </span>
        {value ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-bold text-slate-900">{value.name}</span>
            <span className="block text-sm text-slate-500">
              {t('suppliers.unpaid')}: {money(value.balance)}
            </span>
          </span>
        ) : (
          <span className="flex-1 text-[16px] font-medium text-slate-500">{t('suppliers.none')}</span>
        )}
        <ChevronRight className="size-5 text-slate-400" aria-hidden />
      </button>
      {error && <p className="mt-1.5 text-sm font-medium text-rose-600">{error}</p>}

      <Modal open={open} onClose={() => setOpen(false)} title={t('suppliers.select')} size="lg">
        <div className="flex gap-2">
          <SearchInput className="flex-1" value={search} onChange={setSearch} placeholder={t('suppliers.searchPlaceholder')} autoFocus />
          <Button variant="soft" size="icon" className="size-12" onClick={() => setAdding(true)} aria-label={t('suppliers.add')}>
            <Plus className="size-5" />
          </Button>
        </div>
        <div className="mt-3 min-h-[40vh]">
          <button type="button" onClick={() => choose(null)} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-brand-50">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <Banknote className="size-5" aria-hidden />
            </span>
            <span className="flex-1 text-[16px] font-semibold text-slate-700">{t('suppliers.none')}</span>
          </button>
          {query.isPending ? (
            <ListSkeleton rows={5} />
          ) : !query.data?.data.length ? (
            <EmptyState
              title={search ? t('common.noResults') : t('suppliers.empty')}
              action={<Button icon={Plus} onClick={() => setAdding(true)}>{t('suppliers.add')}</Button>}
            />
          ) : (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {query.data.data.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => choose(s)} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-brand-50">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700">{initials(s.name)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-semibold text-slate-900">{s.name}</span>
                      {s.mobile && <span className="block text-sm text-slate-500">{s.mobile}</span>}
                    </span>
                    <span className={clsx('font-bold tabular-nums', toNumber(s.balance) > 0 ? 'text-orange-600' : 'text-emerald-600')}>{money(s.balance)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <SupplierFormModal open={adding} onClose={() => setAdding(false)} onSaved={(s) => { setAdding(false); choose(s) }} initialName={search} />
    </div>
  )
}

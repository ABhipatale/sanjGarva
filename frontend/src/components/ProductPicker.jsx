import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Package } from 'lucide-react'
import clsx from 'clsx'
import Modal from './ui/Modal'
import SearchInput from './ui/SearchInput'
import { StockBadge } from './ui/Badge'
import { ListSkeleton, EmptyState } from './ui/States'
import { productApi } from '../services/endpoints'
import { useDebounce } from '../hooks/useDebounce'
import { localName, num } from '../utils/format'

/**
 * Search-first product chooser. `location` decides which quantity is highlighted.
 */
export default function ProductPicker({ value, onChange, location = 'store', label, error }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const term = useDebounce(search)

  const query = useQuery({
    queryKey: ['products', 'picker', term],
    queryFn: ({ signal }) => productApi.list({ search: term, per_page: 40 }, { signal }),
    enabled: open,
    placeholderData: keepPreviousData,
  })

  const qtyOf = (p) => (location === 'shop' ? p.shop_qty : p.store_qty)
  const statusOf = (p) => (location === 'shop' ? p.shop_status : p.store_status)

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
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Package className="size-5" aria-hidden />
        </span>
        {value ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-bold text-slate-900">{localName(value)}</span>
            <span className="block text-sm text-slate-500">
              {[value.bottle_size, `${t(`stock.${location}`)}: ${num(qtyOf(value))}`].filter(Boolean).join(' · ')}
            </span>
          </span>
        ) : (
          <span className="flex-1 text-[16px] font-medium text-slate-500">{t('common.selectProduct')}</span>
        )}
        <ChevronRight className="size-5 text-slate-400" aria-hidden />
      </button>
      {error && <p className="mt-1.5 text-sm font-medium text-rose-600">{error}</p>}

      <Modal open={open} onClose={() => setOpen(false)} title={t('common.selectProduct')} size="lg">
        <SearchInput value={search} onChange={setSearch} placeholder={t('sales.searchProduct')} autoFocus />
        <div className="mt-3 min-h-[40vh]">
          {query.isPending ? (
            <ListSkeleton rows={6} />
          ) : !query.data?.data.length ? (
            <EmptyState title={t('common.noResults')} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {query.data.data.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(p)
                      setOpen(false)
                      setSearch('')
                    }}
                    className={clsx('flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-brand-50', value?.id === p.id && 'bg-brand-50')}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-semibold text-slate-900">{localName(p)}</span>
                      <span className="block truncate text-sm text-slate-500">
                        {[p.brand, p.bottle_size, localName(p.category)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-lg font-extrabold tabular-nums text-slate-900">{num(qtyOf(p))}</span>
                      <StockBadge status={statusOf(p)} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </div>
  )
}

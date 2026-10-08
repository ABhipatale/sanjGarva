import { useInfiniteQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowDownLeft, ArrowUpRight, History } from 'lucide-react'
import clsx from 'clsx'
import Button from './ui/Button'
import { Badge } from './ui/Badge'
import { EmptyState, ErrorState, ListSkeleton } from './ui/States'
import { stockApi } from '../services/endpoints'
import { formatDateTime, localName, num } from '../utils/format'

/** Infinite list of stock ledger rows with optional filters. */
export default function MovementList({ productId, location, type, period, compact = false }) {
  const { t } = useTranslation()
  const query = useInfiniteQuery({
    queryKey: ['movements', productId, location, type, period],
    queryFn: ({ pageParam }) => stockApi.movements({ product_id: productId, location, type, ...period, page: pageParam, per_page: compact ? 15 : 30 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined),
  })

  if (query.isPending) return <ListSkeleton rows={compact ? 3 : 6} />
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />
  const rows = query.data.pages.flatMap((p) => p.data)
  if (!rows.length) return <EmptyState icon={History} title={t('stock.noHistory')} />

  return (
    <div>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70">
        {rows.map((m) => {
          const incoming = m.quantity > 0
          return (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3">
              <span className={clsx('flex size-9 shrink-0 items-center justify-center rounded-xl', incoming ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                {incoming ? <ArrowDownLeft className="size-5" aria-hidden /> : <ArrowUpRight className="size-5" aria-hidden />}
              </span>
              <div className="min-w-0 flex-1">
                {!productId && <p className="truncate font-bold text-slate-900">{localName(m.product)}</p>}
                <p className={clsx('truncate text-[15px]', productId ? 'font-semibold text-slate-900' : 'text-slate-600')}>
                  {t(`stock.types.${m.type}`)}
                  {m.type === 'adjustment' && m.notes && ` · ${t(`stock.reasons.${m.notes}`, m.notes)}`}
                </p>
                <p className="text-sm text-slate-500">
                  {formatDateTime(m.created_at)} · <Badge tone={m.location === 'store' ? 'brand' : 'blue'} className="!px-2 !py-0 !text-xs">{t(`stock.${m.location}`)}</Badge>
                </p>
              </div>
              <div className="text-right">
                <p className={clsx('text-lg font-extrabold tabular-nums', incoming ? 'text-emerald-700' : 'text-rose-600')}>
                  {incoming ? '+' : ''}
                  {num(m.quantity)}
                </p>
                <p className="text-xs text-slate-500">
                  {t('stock.balance')}: {num(m.balance_after)}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
      {query.hasNextPage && (
        <div className="mt-3 text-center">
          <Button variant="secondary" onClick={() => query.fetchNextPage()} loading={query.isFetchingNextPage}>
            {t('common.seeAll')}
          </Button>
        </div>
      )}
    </div>
  )
}

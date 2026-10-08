import { useTranslation } from 'react-i18next'
import { AlertCircle, Inbox, Loader2, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import Button from './Button'

export function Spinner({ className }) {
  return <Loader2 className={clsx('size-6 animate-spin text-brand-600', className)} aria-hidden />
}

export function PageLoader() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status">
      <Spinner className="size-8" />
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  )
}

export function Skeleton({ className }) {
  return <div className={clsx('animate-pulse rounded-xl bg-slate-200/80', className)} aria-hidden />
}

export function ListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-[72px]" />
      ))}
    </div>
  )
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon className="size-8" aria-hidden />
      </div>
      <p className="text-lg font-bold text-slate-800">{title}</p>
      {message && <p className="mt-1 max-w-sm text-[15px] text-slate-500">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center" role="alert">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
        <AlertCircle className="size-8" aria-hidden />
      </div>
      <p className="text-[16px] font-semibold text-slate-800">{error?.message || t('errors.generic')}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" icon={RefreshCw} onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  )
}

/** Renders loading / error / empty / children for a react-query result. */
export function QueryState({ query, isEmpty, empty, skeleton, children }) {
  if (query.isPending) return skeleton ?? <ListSkeleton />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  if (isEmpty?.(query.data)) return empty
  return children(query.data)
}

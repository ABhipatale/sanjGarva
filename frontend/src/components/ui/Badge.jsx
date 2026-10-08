import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

const TONES = {
  gray: 'bg-slate-100 text-slate-700',
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-rose-100 text-rose-700',
  brand: 'bg-brand-100 text-brand-800',
  blue: 'bg-sky-100 text-sky-800',
}

export function Badge({ tone = 'gray', children, className }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-semibold', TONES[tone], className)}>
      {children}
    </span>
  )
}

const STOCK = {
  good: { tone: 'green', dot: 'bg-emerald-500', key: 'stock.good' },
  low: { tone: 'amber', dot: 'bg-amber-500', key: 'stock.low' },
  out: { tone: 'red', dot: 'bg-rose-500', key: 'stock.out' },
}

/** 🟢 Good / 🟠 Low / 🔴 Out */
export function StockBadge({ status, className }) {
  const { t } = useTranslation()
  const s = STOCK[status] || STOCK.good
  return (
    <Badge tone={s.tone} className={className}>
      <span className={clsx('size-2 rounded-full', s.dot)} aria-hidden />
      {t(s.key)}
    </Badge>
  )
}

const METHOD_TONES = { cash: 'green', udhari: 'amber', other: 'blue' }
export function PaymentBadge({ method }) {
  const { t } = useTranslation()
  return <Badge tone={METHOD_TONES[method] || 'gray'}>{t(`sales.${method}`)}</Badge>
}

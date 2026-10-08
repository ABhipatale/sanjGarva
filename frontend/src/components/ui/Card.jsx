import { Link } from 'react-router-dom'
import clsx from 'clsx'

export function Card({ className, children, as: Tag = 'div', ...props }) {
  return (
    <Tag className={clsx('rounded-2xl bg-white shadow-card ring-1 ring-slate-200/60', className)} {...props}>
      {children}
    </Tag>
  )
}

export function CardHeader({ title, action, icon: Icon, className }) {
  return (
    <div className={clsx('flex items-center justify-between gap-3 px-4 pt-4 sm:px-5', className)}>
      <h2 className="flex items-center gap-2 text-[17px] font-bold text-slate-900">
        {Icon && <Icon className="size-5 text-brand-600" aria-hidden />}
        {title}
      </h2>
      {action}
    </div>
  )
}

const TONES = {
  default: 'bg-white text-slate-900',
  green: 'bg-emerald-50 text-emerald-900',
  red: 'bg-rose-50 text-rose-900',
  amber: 'bg-amber-50 text-amber-900',
  brand: 'bg-brand-50 text-brand-900',
  blue: 'bg-sky-50 text-sky-900',
}
const ICON_TONES = {
  default: 'bg-slate-100 text-slate-600',
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-rose-100 text-rose-700',
  amber: 'bg-amber-100 text-amber-700',
  brand: 'bg-brand-100 text-brand-700',
  blue: 'bg-sky-100 text-sky-700',
}

/** Big-number tile. Pass `to` to make it a link. */
export function StatCard({ label, value, sub, icon: Icon, tone = 'default', to, onClick, className, active }) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-tight opacity-75">{label}</p>
        {Icon && (
          <span className={clsx('flex size-9 shrink-0 items-center justify-center rounded-xl', ICON_TONES[tone])}>
            <Icon className="size-5" aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-1 text-2xl font-extrabold tracking-tight tabular-nums sm:text-[26px]">{value}</p>
      {sub && <p className="mt-0.5 text-sm opacity-70">{sub}</p>}
    </>
  )
  const classes = clsx(
    'block rounded-2xl p-4 shadow-card ring-1 ring-slate-200/60 transition',
    TONES[tone],
    (to || onClick) && 'hover:shadow-lift active:scale-[0.99]',
    active && 'ring-2 ring-brand-500',
    className,
  )
  if (to) {
    return (
      <Link to={to} className={classes}>
        {inner}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={clsx(classes, 'w-full text-left')} aria-pressed={active}>
        {inner}
      </button>
    )
  }
  return <div className={classes}>{inner}</div>
}

import clsx from 'clsx'

/**
 * Single-choice pill group. `scroll` makes it a horizontally scrolling chip row.
 * options: [{ value, label, icon?, count? }]
 */
export default function Segmented({ options, value, onChange, scroll = false, size = 'md', className, ariaLabel }) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={clsx(
        scroll ? '-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]' : 'grid gap-1 rounded-2xl bg-slate-200/70 p-1',
        className,
      )}
      style={scroll ? undefined : { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = o.value === value
        const Icon = o.icon
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={clsx(
              'flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap font-semibold transition',
              size === 'lg' ? 'h-12 text-base' : 'h-10 text-[15px]',
              scroll
                ? clsx('rounded-full px-4 ring-1 ring-inset', active ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-slate-700 ring-slate-300')
                : clsx('rounded-xl px-2', active ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'),
            )}
          >
            {Icon && <Icon className="size-[18px]" aria-hidden />}
            {o.label}
            {o.count != null && (
              <span className={clsx('rounded-full px-1.5 text-xs', active ? 'bg-white/20' : 'bg-slate-100 text-slate-600')}>{o.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

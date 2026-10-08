import { Minus, Plus } from 'lucide-react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

/** − [qty] + control with large touch targets. */
export default function QtyStepper({ value, onChange, min = 0, max = Infinity, size = 'md', label }) {
  const { t } = useTranslation()
  const set = (v) => {
    const n = Math.max(min, Math.min(max, Number.isFinite(v) ? v : min))
    onChange(n)
  }
  const btn = clsx(
    'flex shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition active:scale-95 disabled:opacity-40',
    size === 'lg' ? 'size-14' : 'size-10',
  )
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label || t('common.quantity')}>
      <button type="button" className={btn} onClick={() => set(value - 1)} disabled={value <= min} aria-label="−1">
        <Minus className="size-5" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value === 0 && min === 0 ? '' : value}
        placeholder="0"
        onChange={(e) => set(parseInt(e.target.value, 10) || 0)}
        onFocus={(e) => e.target.select()}
        aria-label={label || t('common.quantity')}
        className={clsx(
          'w-full min-w-0 rounded-xl border-0 bg-white text-center font-extrabold tabular-nums ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600',
          size === 'lg' ? 'h-14 text-2xl' : 'h-10 w-14 text-lg',
        )}
      />
      <button type="button" className={btn} onClick={() => set(value + 1)} disabled={value >= max} aria-label="+1">
        <Plus className="size-5" />
      </button>
    </div>
  )
}

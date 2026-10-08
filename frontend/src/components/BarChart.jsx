import { useState } from 'react'
import { money, toNumber } from '../utils/format'

/**
 * Lightweight bar chart (no chart library): one series, rounded bars, value on hover/tap.
 * data: [{ label, value }]
 */
export default function BarChart({ data, height = 140, ariaLabel }) {
  const [active, setActive] = useState(null)
  const max = Math.max(1, ...data.map((d) => toNumber(d.value)))
  const shown = active ?? data.length - 1

  return (
    <figure aria-label={ariaLabel}>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium text-slate-500">{data[shown]?.label}</span>
        <span className="text-lg font-extrabold tabular-nums text-slate-900">{money(data[shown]?.value)}</span>
      </div>
      <div className="flex items-end gap-1.5 sm:gap-2" style={{ height }} onMouseLeave={() => setActive(null)}>
        {data.map((d, i) => {
          const h = Math.max(3, (toNumber(d.value) / max) * 100)
          return (
            <button
              key={d.label + i}
              type="button"
              className="group flex h-full flex-1 flex-col justify-end"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              aria-label={`${d.label}: ${money(d.value)}`}
            >
              <span
                className={`block w-full rounded-t-lg transition-colors ${i === shown ? 'bg-brand-600' : 'bg-brand-200 group-hover:bg-brand-300'}`}
                style={{ height: `${h}%` }}
              />
            </button>
          )
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5 sm:gap-2">
        {data.map((d, i) => (
          <span key={d.label + i} className={`flex-1 truncate text-center text-[11px] font-medium ${i === shown ? 'text-brand-700' : 'text-slate-400'}`}>
            {d.short ?? d.label}
          </span>
        ))}
      </div>
    </figure>
  )
}

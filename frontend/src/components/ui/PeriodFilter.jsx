import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays } from 'lucide-react'
import Segmented from './Segmented'
import { isoDate } from '../../utils/format'

const PERIODS = ['today', 'yesterday', 'week', 'month', 'last_month']

/**
 * value: { period } | { from, to }. Produces API query params directly.
 */
export default function PeriodFilter({ value, onChange, periods = PERIODS, allowAll = false }) {
  const { t } = useTranslation()
  const isCustom = !!(value.from || value.to)
  const [showCustom, setShowCustom] = useState(isCustom)
  const [from, setFrom] = useState(value.from || isoDate(new Date(Date.now() - 6 * 864e5)))
  const [to, setTo] = useState(value.to || isoDate())

  const labels = { today: t('periods.today'), yesterday: t('periods.yesterday'), week: t('periods.week'), month: t('periods.month'), last_month: t('periods.lastMonth'), all: t('common.all') }
  const options = [...(allowAll ? ['all'] : []), ...periods].map((p) => ({ value: p, label: labels[p] }))
  options.push({ value: 'custom', label: t('periods.custom'), icon: CalendarDays })

  const select = (p) => {
    if (p === 'custom') {
      setShowCustom(true)
      onChange({ from, to })
    } else {
      setShowCustom(false)
      onChange({ period: p })
    }
  }

  return (
    <div className="space-y-2 no-print">
      <Segmented scroll options={options} value={showCustom ? 'custom' : value.period} onChange={select} ariaLabel={t('common.filter')} />
      {showCustom && (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-600">{t('common.from')}</span>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => {
                setFrom(e.target.value)
                onChange({ from: e.target.value, to })
              }}
              className="h-11 w-full rounded-xl border-0 bg-white px-3 text-[15px] ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-600">{t('common.to')}</span>
            <input
              type="date"
              value={to}
              min={from}
              max={isoDate()}
              onChange={(e) => {
                setTo(e.target.value)
                onChange({ from, to: e.target.value })
              }}
              className="h-11 w-full rounded-xl border-0 bg-white px-3 text-[15px] ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600"
            />
          </label>
        </div>
      )}
    </div>
  )
}

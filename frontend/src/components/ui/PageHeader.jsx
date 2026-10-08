import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function PageHeader({ title, subtitle, back, actions }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <div className="mb-4 flex items-center gap-3 no-print">
      {back && (
        <button
          onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
          className="-ml-1 flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
          aria-label={t('common.back')}
        >
          <ArrowLeft className="size-5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[22px] font-extrabold leading-tight text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="truncate text-[15px] text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

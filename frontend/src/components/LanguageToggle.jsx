import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import clsx from 'clsx'

/** One-tap switch between मराठी and English. */
export default function LanguageToggle({ className, dark }) {
  const { i18n, t } = useTranslation()
  const next = i18n.language === 'mr' ? 'en' : 'mr'
  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(next)}
      className={clsx(
        'inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition',
        dark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
        className,
      )}
      aria-label={t('common.language')}
    >
      <Languages className="size-[18px]" aria-hidden />
      {next === 'en' ? 'English' : 'मराठी'}
    </button>
  )
}

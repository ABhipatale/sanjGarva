import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './Button'

export default function Pagination({ meta, onChange }) {
  const { t } = useTranslation()
  if (!meta || meta.last_page <= 1) return null
  return (
    <nav className="mt-4 flex items-center justify-between gap-3 no-print" aria-label="Pagination">
      <Button variant="secondary" icon={ChevronLeft} disabled={meta.current_page <= 1} onClick={() => onChange(meta.current_page - 1)}>
        {t('common.previous')}
      </Button>
      <span className="text-sm font-medium text-slate-600">{t('common.page', { page: meta.current_page, pages: meta.last_page })}</span>
      <Button variant="secondary" disabled={meta.current_page >= meta.last_page} onClick={() => onChange(meta.current_page + 1)}>
        {t('common.next')}
        <ChevronRight className="size-5" aria-hidden />
      </Button>
    </nav>
  )
}

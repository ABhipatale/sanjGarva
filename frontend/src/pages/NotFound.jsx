import { useTranslation } from 'react-i18next'
import { Home, SearchX } from 'lucide-react'
import { EmptyState } from '../components/ui/States'
import Button from '../components/ui/Button'

export default function NotFound() {
  const { t } = useTranslation()
  return <EmptyState icon={SearchX} title={t('errors.notFound')} action={<Button to="/" icon={Home}>{t('nav.home')}</Button>} />
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Segmented from '../../components/ui/Segmented'
import PeriodFilter from '../../components/ui/PeriodFilter'
import ProductPicker from '../../components/ProductPicker'
import MovementList from '../../components/MovementList'

const TYPES = ['purchase', 'transfer_out', 'transfer_in', 'sale', 'adjustment', 'sale_void', 'opening']

export default function StockHistory() {
  const { t } = useTranslation()
  const [product, setProduct] = useState(null)
  const [location, setLocation] = useState('')
  const [type, setType] = useState('')
  const [period, setPeriod] = useState({ period: 'all' })

  const typeLabel = (ty) => (ty === 'transfer_out' ? `${t('stock.types.transfer_out')} (${t('stock.store')})` : ty === 'transfer_in' ? `${t('stock.types.transfer_in')} (${t('stock.shop')})` : t(`stock.types.${ty}`))

  return (
    <div className="space-y-3">
      <PageHeader title={t('stock.history')} back />
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <ProductPicker value={product} onChange={setProduct} location={location || 'store'} />
        </div>
        {product && (
          <button onClick={() => setProduct(null)} className="mt-3 rounded-xl bg-white p-3 text-slate-500 ring-1 ring-slate-200" aria-label={t('common.close')}>
            <X className="size-5" />
          </button>
        )}
      </div>
      <Segmented
        value={location}
        onChange={setLocation}
        options={[
          { value: '', label: t('common.all') },
          { value: 'store', label: t('stock.store') },
          { value: 'shop', label: t('stock.shop') },
        ]}
      />
      <Segmented scroll value={type} onChange={setType} options={[{ value: '', label: t('common.all') }, ...TYPES.map((ty) => ({ value: ty, label: typeLabel(ty) }))]} />
      <PeriodFilter value={period} onChange={setPeriod} allowAll />
      <MovementList productId={product?.id} location={location} type={type} period={period.period === 'all' ? {} : period} />
    </div>
  )
}

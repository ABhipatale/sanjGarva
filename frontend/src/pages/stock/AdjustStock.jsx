import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { SlidersHorizontal } from 'lucide-react'
import clsx from 'clsx'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Segmented from '../../components/ui/Segmented'
import QtyStepper from '../../components/ui/QtyStepper'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Field'
import ProductPicker from '../../components/ProductPicker'
import { stockApi } from '../../services/endpoints'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import { useInvalidateBusiness } from '../../hooks/queries'
import { usePresetProduct } from '../../hooks/usePresetProduct'
import { localName, num } from '../../utils/format'

const REASONS = ['broken', 'damaged', 'missing', 'expired', 'correction', 'found']

export default function AdjustStock() {
  const { t } = useTranslation()
  const toast = useToast()
  const confirm = useConfirm()
  const invalidate = useInvalidateBusiness()
  const [params] = useSearchParams()
  const [location, setLocation] = useState(params.get('location') === 'store' ? 'store' : 'shop')
  const [product, setProductState] = useState(null)
  const [actual, setActual] = useState(0)
  const [reason, setReason] = useState('broken')
  const [notes, setNotes] = useState('')

  const systemQty = product ? product[`${location}_qty`] : 0
  const diff = actual - systemQty

  const setProduct = (p) => {
    setProductState(p)
    setActual(p ? p[`${location}_qty`] : 0)
  }
  usePresetProduct(setProduct)

  const changeLocation = (loc) => {
    setLocation(loc)
    if (product) setActual(product[`${loc}_qty`])
  }

  const mutation = useMutation({
    mutationFn: () => stockApi.adjust({ product_id: product.id, location, actual_quantity: actual, reason, notes: notes || null }),
    onSuccess: () => {
      toast.success(t('stock.adjustSuccess'))
      invalidate()
      setProductState({ ...product, [`${location}_qty`]: actual })
      setNotes('')
    },
    onError: (err) => toast.error(err.message),
  })

  const submit = async (e) => {
    e.preventDefault()
    if (!product) return
    if (diff === 0) {
      toast.info(t('stock.noChange'))
      return
    }
    const ok = await confirm({
      title: t('stock.adjustConfirm', { product: localName(product), location: t(`stock.${location}`), from: systemQty, to: actual }),
      message: `${t('stock.reason')}: ${t(`stock.reasons.${reason}`)}`,
      confirmText: t('stock.adjust'),
      danger: diff < 0,
    })
    if (ok) mutation.mutate()
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t('stock.adjustTitle')} back />
      <form onSubmit={submit} className="space-y-4">
        <Segmented
          size="lg"
          value={location}
          onChange={changeLocation}
          ariaLabel={t('stock.location')}
          options={[
            { value: 'shop', label: t('stock.shop') },
            { value: 'store', label: t('stock.store') },
          ]}
        />
        <ProductPicker value={product} onChange={setProduct} location={location} label={t('products.name')} />

        {product && (
          <>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-semibold text-slate-600">{t('stock.systemQty')}</p>
                <p className="text-3xl font-extrabold tabular-nums">{num(systemQty)}</p>
              </div>
              <p className="mb-2 mt-4 text-[15px] font-semibold text-slate-700">{t('stock.actualQty')}</p>
              <QtyStepper value={actual} onChange={setActual} min={0} max={1000000} size="lg" />
              <div className={clsx('mt-3 rounded-xl px-4 py-2.5 text-center text-lg font-extrabold', diff === 0 ? 'bg-slate-100 text-slate-500' : diff < 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700')}>
                {t('stock.difference')}: {diff > 0 ? '+' : ''}
                {num(diff)}
              </div>
            </Card>

            <div>
              <p className="mb-2 text-[15px] font-semibold text-slate-700">{t('stock.reason')}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    aria-pressed={reason === r}
                    className={clsx('h-12 rounded-xl text-[15px] font-semibold ring-1 ring-inset', reason === r ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-slate-700 ring-slate-300')}
                  >
                    {t(`stock.reasons.${r}`)}
                  </button>
                ))}
              </div>
            </div>
            <Input label={t('common.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} optional />

            <Button type="submit" size="xl" block icon={SlidersHorizontal} loading={mutation.isPending} disabled={diff === 0}>
              {t('stock.adjust')}
            </Button>
          </>
        )}
      </form>
    </div>
  )
}

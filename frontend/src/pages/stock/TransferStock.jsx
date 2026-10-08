import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowRightLeft, Boxes, Store } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import QtyStepper from '../../components/ui/QtyStepper'
import { Card } from '../../components/ui/Card'
import ProductPicker from '../../components/ProductPicker'
import { stockApi } from '../../services/endpoints'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import { useInvalidateBusiness } from '../../hooks/queries'
import { usePresetProduct } from '../../hooks/usePresetProduct'
import { localName, num } from '../../utils/format'

export default function TransferStock() {
  const { t } = useTranslation()
  const toast = useToast()
  const confirm = useConfirm()
  const invalidate = useInvalidateBusiness()
  const [product, setProduct] = useState(null)
  const [qty, setQty] = useState(0)
  usePresetProduct(setProduct)

  const available = product?.store_qty ?? 0
  const tooMuch = qty > available

  const mutation = useMutation({
    mutationFn: () => stockApi.transfer({ items: [{ product_id: product.id, quantity: qty }] }),
    onSuccess: () => {
      toast.success(t('stock.transferSuccess', { qty: `${qty} ${localName(product)}` }))
      invalidate()
      setProduct({ ...product, store_qty: product.store_qty - qty, shop_qty: product.shop_qty + qty })
      setQty(0)
    },
    onError: (err) => toast.error(err.message),
  })

  const submit = async (e) => {
    e.preventDefault()
    if (!product || qty <= 0) return
    if (tooMuch) {
      toast.error(t('errors.INSUFFICIENT_STORE_STOCK', { available, product: localName(product) }))
      return
    }
    const ok = await confirm({
      title: t('stock.transferConfirm', { qty, product: localName(product) }),
      message: `${t('stock.store')}: ${available} → ${available - qty}   ·   ${t('stock.shop')}: ${product.shop_qty} → ${product.shop_qty + qty}`,
      confirmText: t('stock.transferButton'),
    })
    if (ok) mutation.mutate()
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t('stock.transferTitle')} back />
      <form onSubmit={submit} className="space-y-4">
        <ProductPicker value={product} onChange={(p) => { setProduct(p); setQty(0) }} location="store" label={t('products.name')} />

        {product && (
          <>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-semibold text-slate-600">{t('stock.availableInStore')}</p>
                <p className="text-3xl font-extrabold tabular-nums text-slate-900">{num(available)}</p>
              </div>
              <p className="mb-2 mt-4 text-[15px] font-semibold text-slate-700">{t('stock.transferQty')}</p>
              <QtyStepper value={qty} onChange={setQty} min={0} max={Math.max(available, 0)} size="lg" />
              <div className="mt-3 flex flex-wrap gap-2">
                {[5, 10, 12, 24].filter((n) => n <= available).map((n) => (
                  <button key={n} type="button" onClick={() => setQty(n)} className="rounded-full bg-brand-50 px-4 py-2 font-semibold text-brand-800 hover:bg-brand-100">
                    {n}
                  </button>
                ))}
                {available > 0 && (
                  <button type="button" onClick={() => setQty(available)} className="rounded-full bg-brand-50 px-4 py-2 font-semibold text-brand-800 hover:bg-brand-100">
                    {t('common.all')} ({available})
                  </button>
                )}
              </div>
              {tooMuch && (
                <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700" role="alert">
                  {t('errors.INSUFFICIENT_STORE_STOCK', { available, product: localName(product) })}
                </p>
              )}
            </Card>

            <Card className="p-4">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{t('stock.afterTransfer')}</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-2xl bg-brand-50 p-3 text-center">
                  <Boxes className="mx-auto size-6 text-brand-700" aria-hidden />
                  <p className="text-sm font-semibold text-slate-600">{t('stock.store')}</p>
                  <p className="text-xl font-extrabold tabular-nums">
                    {num(available)} → <span className="text-brand-700">{num(Math.max(available - qty, 0))}</span>
                  </p>
                </div>
                <ArrowDown className="size-6 shrink-0 -rotate-90 text-slate-400" aria-hidden />
                <div className="flex-1 rounded-2xl bg-sky-50 p-3 text-center">
                  <Store className="mx-auto size-6 text-sky-700" aria-hidden />
                  <p className="text-sm font-semibold text-slate-600">{t('stock.shop')}</p>
                  <p className="text-xl font-extrabold tabular-nums">
                    {num(product.shop_qty)} → <span className="text-sky-700">{num(product.shop_qty + (tooMuch ? 0 : qty))}</span>
                  </p>
                </div>
              </div>
            </Card>

            <Button type="submit" size="xl" block icon={ArrowRightLeft} loading={mutation.isPending} disabled={qty <= 0 || tooMuch}>
              {t('stock.transferButton')} {qty > 0 && `· ${qty}`}
            </Button>
          </>
        )}
      </form>
    </div>
  )
}

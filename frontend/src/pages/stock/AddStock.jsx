import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronDown, PackagePlus, Plus } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import QtyStepper from '../../components/ui/QtyStepper'
import { Card } from '../../components/ui/Card'
import { Input, MoneyInput, Textarea } from '../../components/ui/Field'
import ProductPicker from '../../components/ProductPicker'
import { stockApi } from '../../services/endpoints'
import { fieldErrors } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { useInvalidateBusiness } from '../../hooks/queries'
import { usePresetProduct } from '../../hooks/usePresetProduct'
import { isoDate, localName, money, num, toNumber } from '../../utils/format'

export default function AddStock() {
  const { t } = useTranslation()
  const toast = useToast()
  const invalidate = useInvalidateBusiness()
  const [product, setProductState] = useState(null)
  const [qty, setQty] = useState(0)
  const [cost, setCost] = useState('')
  const [selling, setSelling] = useState('')
  const [date, setDate] = useState(isoDate())
  const [supplier, setSupplier] = useState('')
  const [invoice, setInvoice] = useState('')
  const [notes, setNotes] = useState('')
  const [more, setMore] = useState(false)

  const setProduct = (p) => {
    setProductState(p)
    setCost(p ? String(toNumber(p.cost_price)) : '')
    setSelling(p ? String(toNumber(p.selling_price)) : '')
  }
  usePresetProduct(setProduct)

  const mutation = useMutation({
    mutationFn: () =>
      stockApi.add({
        product_id: product.id,
        quantity: qty,
        cost_price: cost,
        selling_price: selling || null,
        purchase_date: date,
        supplier: supplier || null,
        invoice_no: invoice || null,
        notes: notes || null,
      }),
    onSuccess: () => {
      toast.success(`${t('stock.addSuccess')} ${localName(product)} +${qty}`)
      invalidate()
      setProductState({ ...product, store_qty: product.store_qty + qty })
      setQty(0)
      setNotes('')
    },
    onError: (err) => !err.errors && toast.error(err.message),
  })
  const errors = fieldErrors(mutation.error)

  const submit = (e) => {
    e.preventDefault()
    if (!product || qty <= 0) return
    mutation.mutate()
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t('stock.addStockTitle')} back />
      <form onSubmit={submit} className="space-y-4">
        <ProductPicker value={product} onChange={setProduct} location="store" label={t('products.name')} error={errors.product_id} />
        {!product && (
          <p className="text-center text-sm text-slate-500">
            <Button to="/products/new" variant="ghost" size="sm" icon={Plus}>{t('products.add')}</Button>
          </p>
        )}

        {product && (
          <>
            <Card className="p-4">
              <p className="mb-2 text-[15px] font-semibold text-slate-700">{t('common.quantity')}</p>
              <QtyStepper value={qty} onChange={setQty} min={0} max={1000000} size="lg" />
              <div className="mt-3 flex flex-wrap gap-2">
                {[6, 12, 24, 48].map((n) => (
                  <button key={n} type="button" onClick={() => setQty((q) => q + n)} className="rounded-full bg-brand-50 px-4 py-2 font-semibold text-brand-800 hover:bg-brand-100">
                    +{n}
                  </button>
                ))}
              </div>
              {errors.quantity && <p className="mt-2 text-sm font-medium text-rose-600">{errors.quantity}</p>}

              <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 text-center">
                <div>
                  <p className="text-sm text-slate-500">{t('stock.currentStock')}</p>
                  <p className="text-2xl font-extrabold tabular-nums">{num(product.store_qty)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">{t('stock.newStock')}</p>
                  <p className="text-2xl font-extrabold tabular-nums text-emerald-600">{num(product.store_qty + qty)}</p>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <MoneyInput label={t('products.costPrice')} value={cost} onChange={(e) => setCost(e.target.value)} error={errors.cost_price} required />
              <MoneyInput label={t('products.sellingPrice')} value={selling} onChange={(e) => setSelling(e.target.value)} error={errors.selling_price} />
            </div>
            {qty > 0 && toNumber(cost) > 0 && (
              <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-[15px] font-semibold text-emerald-800">
                {t('common.total')}: {money(qty * toNumber(cost))}
              </p>
            )}
            <Input label={t('stock.purchaseDate')} type="date" max={isoDate()} value={date} onChange={(e) => setDate(e.target.value)} error={errors.purchase_date} />

            <button type="button" onClick={() => setMore(!more)} className="flex items-center gap-1 text-[15px] font-semibold text-brand-700">
              <ChevronDown className={`size-5 transition ${more ? 'rotate-180' : ''}`} aria-hidden />
              {t('common.details')} ({t('stock.supplier')}, {t('stock.invoiceNo')})
            </button>
            {more && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input label={t('stock.supplier')} value={supplier} onChange={(e) => setSupplier(e.target.value)} optional />
                  <Input label={t('stock.invoiceNo')} value={invoice} onChange={(e) => setInvoice(e.target.value)} optional />
                </div>
                <Textarea label={t('common.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} optional />
              </div>
            )}

            <Button type="submit" size="xl" block variant="success" icon={PackagePlus} loading={mutation.isPending} disabled={qty <= 0 || cost === ''}>
              {t('stock.addStock')} {qty > 0 && `· +${qty}`}
            </Button>
          </>
        )}
      </form>
    </div>
  )
}

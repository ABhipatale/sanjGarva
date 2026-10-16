import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ListPlus, PackagePlus, Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Segmented from '../../components/ui/Segmented'
import QtyStepper from '../../components/ui/QtyStepper'
import { Card } from '../../components/ui/Card'
import { Input, MoneyInput, Textarea } from '../../components/ui/Field'
import ProductPicker from '../../components/ProductPicker'
import SupplierPicker from '../../components/SupplierPicker'
import { stockApi, supplierApi } from '../../services/endpoints'
import { fieldErrors } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import { useInvalidateBusiness, useSettings } from '../../hooks/queries'
import { useWhatsApp } from '../../context/WhatsAppContext'
import { usePresetProduct } from '../../hooks/usePresetProduct'
import { storage } from '../../utils/storage'
import { formatDate, isoDate, localName, money, num, toNumber } from '../../utils/format'

const PAY_MODE_KEY = 'add-stock-pay-mode'

/**
 * Add stock to the Store as one bill: pick the supplier once, add every product of the delivery,
 * set the payment once, save once. A single product works too — fill it and press Add Stock.
 */
export default function AddStock() {
  const { t } = useTranslation()
  const toast = useToast()
  const confirm = useConfirm()
  const invalidate = useInvalidateBusiness()
  const offerWhatsApp = useWhatsApp()
  const { data: settings } = useSettings()
  const [params] = useSearchParams()

  // Bill
  const [supplier, setSupplier] = useState(null)
  const [lines, setLines] = useState([]) // [{ product, qty, cost, selling }]
  const [date, setDate] = useState(isoDate())
  const [payMode, setPayModeState] = useState(() => storage.get(PAY_MODE_KEY) || 'full')
  const [partPaid, setPartPaid] = useState('')
  const [invoice, setInvoice] = useState('')
  const [notes, setNotes] = useState('')
  const [more, setMore] = useState(false)

  // Product being entered
  const [product, setProductState] = useState(null)
  const [qty, setQty] = useState(0)
  const [cost, setCost] = useState('')
  const [selling, setSelling] = useState('')

  const setProduct = (p) => {
    // Choosing a product already in the bill opens that line for changes.
    const existing = p && lines.find((l) => l.product.id === p.id)
    setProductState(p)
    setQty(existing ? existing.qty : 0)
    setCost(existing ? existing.cost : p ? String(toNumber(p.cost_price)) : '')
    setSelling(existing ? existing.selling : p ? String(toNumber(p.selling_price)) : '')
  }
  usePresetProduct(setProduct)

  // Opened from a supplier's page (?supplier=ID): pre-select that supplier.
  const presetSupplier = params.get('supplier')
  const preset = useQuery({ queryKey: ['supplier', presetSupplier], queryFn: () => supplierApi.get(presetSupplier).then((r) => r.data), enabled: !!presetSupplier })
  useEffect(() => {
    if (preset.data) setSupplier(preset.data)
  }, [preset.data])

  const setPayMode = (m) => {
    setPayModeState(m)
    storage.set(PAY_MODE_KEY, m)
  }

  const clearEditor = () => {
    setProductState(null)
    setQty(0)
    setCost('')
    setSelling('')
  }

  // The product being entered counts as part of the bill as soon as it has a quantity and cost.
  const pending = product && qty > 0 && cost !== '' ? { product, qty, cost, selling } : null
  const allLines = pending ? [...lines.filter((l) => l.product.id !== pending.product.id), pending] : lines
  const editingLine = product && lines.some((l) => l.product.id === product.id)

  const billQty = allLines.reduce((s, l) => s + l.qty, 0)
  const billTotal = allLines.reduce((s, l) => s + l.qty * toNumber(l.cost), 0)
  const paid = !supplier ? billTotal : payMode === 'full' ? billTotal : payMode === 'none' ? 0 : Math.min(toNumber(partPaid), billTotal)
  const unpaid = Math.max(0, billTotal - paid)
  const partTooMuch = supplier && payMode === 'part' && toNumber(partPaid) > billTotal

  const addLine = () => {
    if (!pending) return
    setLines(allLines)
    clearEditor()
  }

  const removeLine = async (line) => {
    if (!(await confirm({ title: t('stock.removeLineConfirm', { product: localName(line.product) }), danger: true, confirmText: t('common.delete') }))) return
    setLines((ls) => ls.filter((l) => l.product.id !== line.product.id))
    if (product?.id === line.product.id) clearEditor()
  }

  const mutation = useMutation({
    mutationFn: () =>
      stockApi.addBill({
        items: allLines.map((l) => ({ product_id: l.product.id, quantity: l.qty, cost_price: l.cost, selling_price: l.selling || null })),
        purchase_date: date,
        supplier_id: supplier?.id ?? null,
        paid_amount: supplier ? paid : null,
        payment_method: 'cash',
        invoice_no: invoice || null,
        notes: notes || null,
      }),
    onSuccess: () => {
      toast.success(allLines.length === 1
        ? `${t('stock.addSuccess')} ${localName(allLines[0].product)} +${allLines[0].qty}`
        : t('stock.billSuccess', { count: allLines.length, qty: num(billQty) }))
      invalidate()
      // Keep the supplier and date: the owner may have another bill from the same delivery.
      if (supplier) {
        const balance = toNumber(supplier.balance) + unpaid
        setSupplier({ ...supplier, balance })
        offerWhatsApp({
          name: supplier.name,
          mobile: supplier.mobile,
          message: t('whatsapp.supplierBill', {
            name: supplier.name,
            bar: localName(settings, 'bar_name') || t('app.name'),
            date: formatDate(date),
            items: allLines.map((l) => `• ${localName(l.product)} × ${num(l.qty)} = ${money(l.qty * toNumber(l.cost))}`).join('\n'),
            total: money(billTotal),
            paid: money(paid),
            unpaid: money(unpaid),
            balance: money(balance),
          }),
        })
      }
      setLines([])
      clearEditor()
      setPartPaid('')
      setInvoice('')
      setNotes('')
    },
    onError: (err) => toast.error(err.message),
  })
  const errors = fieldErrors(mutation.error)

  const submit = (e) => {
    e.preventDefault()
    if (!allLines.length || partTooMuch) return
    mutation.mutate()
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t('stock.addStockTitle')} back />
      <form onSubmit={submit} className="space-y-4">
        <SupplierPicker value={supplier} onChange={setSupplier} label={t('stock.supplier')} error={errors.supplier_id} />

        {lines.length > 0 && (
          <Card className="overflow-hidden">
            <p className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {t('stock.billItems', { count: lines.length })}
            </p>
            <ul className="divide-y divide-slate-100">
              {lines.map((l) => (
                <li key={l.product.id} className={clsx('flex items-center gap-2 py-2 pl-4 pr-2', product?.id === l.product.id && 'bg-brand-50')}>
                  <button type="button" onClick={() => setProduct(l.product)} className="min-w-0 flex-1 py-1 text-left">
                    <p className="truncate font-bold text-slate-900">{localName(l.product)}</p>
                    <p className="text-sm tabular-nums text-slate-500">
                      +{num(l.qty)} × {money(l.cost)}
                    </p>
                  </button>
                  <p className="font-bold tabular-nums">{money(l.qty * toNumber(l.cost))}</p>
                  <Button variant="ghost" size="icon" icon={Trash2} onClick={() => removeLine(l)} aria-label={t('common.delete')} className="text-rose-600" />
                </li>
              ))}
            </ul>
          </Card>
        )}

        <ProductPicker
          value={product}
          onChange={setProduct}
          location="store"
          label={lines.length ? t('stock.addAnotherProduct') : t('products.name')}
          error={errors.product_id}
        />
        {!product && !lines.length && (
          <p className="text-center text-sm text-slate-500">
            <Button to="/products/new" variant="ghost" size="sm" icon={Plus}>{t('products.add')}</Button>
          </p>
        )}

        {product && (
          <Card className="space-y-4 p-4">
            <div>
              <p className="mb-2 text-[15px] font-semibold text-slate-700">{t('common.quantity')}</p>
              <QtyStepper value={qty} onChange={setQty} min={0} max={1000000} size="lg" />
              <div className="mt-3 flex flex-wrap gap-2">
                {[6, 12, 24, 48].map((n) => (
                  <button key={n} type="button" onClick={() => setQty((q) => q + n)} className="rounded-full bg-brand-50 px-4 py-2 font-semibold text-brand-800 hover:bg-brand-100">
                    +{n}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 text-center">
              <div>
                <p className="text-sm text-slate-500">{t('stock.currentStock')}</p>
                <p className="text-2xl font-extrabold tabular-nums">{num(product.store_qty)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">{t('stock.newStock')}</p>
                <p className="text-2xl font-extrabold tabular-nums text-emerald-600">{num(product.store_qty + qty)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MoneyInput label={t('products.costPrice')} value={cost} onChange={(e) => setCost(e.target.value)} required />
              <MoneyInput label={t('products.sellingPrice')} value={selling} onChange={(e) => setSelling(e.target.value)} />
            </div>

            <Button variant="soft" size="lg" block icon={ListPlus} onClick={addLine} disabled={!pending}>
              {editingLine ? t('stock.updateInBill') : t('stock.addToBill')}
              {pending && ` · ${money(pending.qty * toNumber(pending.cost))}`}
            </Button>
          </Card>
        )}

        {allLines.length > 0 && (
          <>
            <Card className="space-y-3 p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-[15px] font-semibold text-slate-600">
                  {t('suppliers.billTotal')} · {t('stock.billCount', { count: allLines.length, qty: num(billQty) })}
                </p>
                <p className="text-2xl font-extrabold tabular-nums">{money(billTotal)}</p>
              </div>
              {supplier && (
                <>
                  <Segmented
                    value={payMode}
                    onChange={setPayMode}
                    ariaLabel={t('suppliers.payment')}
                    options={[
                      { value: 'full', label: t('suppliers.paidFull') },
                      { value: 'part', label: t('suppliers.paidPart') },
                      { value: 'none', label: t('suppliers.paidNone') },
                    ]}
                  />
                  {payMode === 'part' && (
                    <MoneyInput
                      label={t('suppliers.payAmount')}
                      value={partPaid}
                      onChange={(e) => setPartPaid(e.target.value)}
                      error={partTooMuch ? t('errors.PAID_MORE_THAN_BILL', { total: money(billTotal) }) : errors.paid_amount}
                    />
                  )}
                  <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 text-center">
                    <div>
                      <p className="text-sm text-slate-500">{t('suppliers.paid')}</p>
                      <p className="text-xl font-extrabold tabular-nums text-emerald-600">{money(paid)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">{t('suppliers.unpaidOnBill')}</p>
                      <p className={clsx('text-xl font-extrabold tabular-nums', unpaid > 0 ? 'text-orange-600' : 'text-slate-400')}>{money(unpaid)}</p>
                    </div>
                  </div>
                </>
              )}
            </Card>

            <Input label={t('stock.purchaseDate')} type="date" max={isoDate()} value={date} onChange={(e) => setDate(e.target.value)} error={errors.purchase_date} />

            <button type="button" onClick={() => setMore(!more)} className="flex items-center gap-1 text-[15px] font-semibold text-brand-700">
              <ChevronDown className={`size-5 transition ${more ? 'rotate-180' : ''}`} aria-hidden />
              {t('common.details')} ({t('stock.invoiceNo')}, {t('common.notes')})
            </button>
            {more && (
              <div className="space-y-3">
                <Input label={t('stock.invoiceNo')} value={invoice} onChange={(e) => setInvoice(e.target.value)} optional />
                <Textarea label={t('common.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} optional />
              </div>
            )}

            <Button type="submit" size="xl" block variant="success" icon={PackagePlus} loading={mutation.isPending} disabled={partTooMuch}>
              {t('stock.addStock')} · {t('stock.billCount', { count: allLines.length, qty: num(billQty) })}
            </Button>
          </>
        )}
      </form>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Segmented from './ui/Segmented'
import { Input, MoneyInput } from './ui/Field'
import { supplierApi } from '../services/endpoints'
import { fieldErrors } from '../services/api'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { useInvalidateBusiness } from '../hooks/queries'
import { isoDate, money, toNumber } from '../utils/format'

const METHODS = ['cash', 'upi', 'bank', 'other']

/** Pay a supplier part or all of what is unpaid. */
export default function PaySupplierModal({ open, onClose, supplier }) {
  const { t } = useTranslation()
  const toast = useToast()
  const confirm = useConfirm()
  const invalidate = useInvalidateBusiness()
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(isoDate())
  const [method, setMethod] = useState('cash')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      setAmount('')
      setDate(isoDate())
      setMethod('cash')
      setNotes('')
    }
  }, [open])

  const balance = toNumber(supplier?.balance)
  const value = toNumber(amount)
  const tooMuch = value > balance

  const mutation = useMutation({
    mutationFn: () => supplierApi.payment(supplier.id, { amount: value, payment_date: date, payment_method: method, notes: notes || null }),
    onSuccess: () => {
      toast.success(t('suppliers.paySuccess', { amount: money(value), name: supplier.name }))
      invalidate()
      onClose()
    },
    onError: (err) => !err.errors && toast.error(err.message),
  })
  const errors = fieldErrors(mutation.error)

  const submit = async (e) => {
    e.preventDefault()
    if (value <= 0 || tooMuch) return
    const ok = await confirm({
      title: t('suppliers.payConfirm', { amount: money(value), name: supplier.name }),
      message: `${t('suppliers.afterPay')}: ${money(balance - value)}`,
      confirmText: t('suppliers.pay'),
    })
    if (ok) mutation.mutate()
  }

  if (!supplier) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('suppliers.pay')}
      footer={
        <Button type="submit" form="supplier-pay-form" variant="success" size="lg" block loading={mutation.isPending} disabled={value <= 0 || tooMuch}>
          {t('suppliers.pay')} {value > 0 && `· ${money(value)}`}
        </Button>
      }
    >
      <form id="supplier-pay-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-500">{t('suppliers.unpaid')}</p>
            <p className="text-2xl font-extrabold tabular-nums text-orange-600">{money(balance)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-500">{t('suppliers.afterPay')}</p>
            <p className="text-2xl font-extrabold tabular-nums text-emerald-600">{money(Math.max(0, balance - value))}</p>
          </div>
        </div>

        {balance <= 0 ? (
          <p className="rounded-xl bg-emerald-50 p-3 text-center font-semibold text-emerald-700">{t('suppliers.noDues')}</p>
        ) : (
          <>
            <MoneyInput
              label={t('suppliers.payAmount')}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              size="lg"
              autoFocus
              error={tooMuch ? t('errors.SUPPLIER_PAYMENT_EXCEEDS_BALANCE', { balance: money(balance) }) : errors.amount}
            />
            <div className="flex flex-wrap gap-2">
              {[balance, 500, 1000, 5000].filter((v, i) => v > 0 && (i === 0 || v < balance)).map((q, i) => (
                <button key={q} type="button" onClick={() => setAmount(String(q))} className="rounded-full bg-brand-50 px-4 py-2 text-[15px] font-semibold text-brand-800 hover:bg-brand-100">
                  {i === 0 ? `${t('common.all')} ${money(q)}` : money(q)}
                </button>
              ))}
            </div>
            <div>
              <p className="mb-1.5 text-[15px] font-semibold text-slate-700">{t('customers.paymentMethod')}</p>
              <Segmented scroll value={method} onChange={setMethod} options={METHODS.map((m) => ({ value: m, label: t(`payment.${m}`) }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('customers.paymentDate')} type="date" value={date} max={isoDate()} onChange={(e) => setDate(e.target.value)} error={errors.payment_date} />
              <Input label={t('common.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} optional />
            </div>
          </>
        )}
      </form>
    </Modal>
  )
}

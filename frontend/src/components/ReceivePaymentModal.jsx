import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Segmented from './ui/Segmented'
import { Input, MoneyInput } from './ui/Field'
import CustomerPicker from './CustomerPicker'
import { customerApi } from '../services/endpoints'
import { fieldErrors } from '../services/api'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { useInvalidateBusiness } from '../hooks/queries'
import { isoDate, money, toNumber } from '../utils/format'

const METHODS = ['cash', 'upi', 'card', 'bank', 'other']

/**
 * Receive udhari payment. If `customer` is not given, a customer picker is shown first.
 */
export default function ReceivePaymentModal({ open, onClose, customer: fixedCustomer, onDone }) {
  const { t } = useTranslation()
  const toast = useToast()
  const confirm = useConfirm()
  const invalidate = useInvalidateBusiness()
  const [customer, setCustomer] = useState(fixedCustomer || null)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(isoDate())
  const [method, setMethod] = useState('cash')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      setCustomer(fixedCustomer || null)
      setAmount('')
      setDate(isoDate())
      setMethod('cash')
      setNotes('')
    }
  }, [open, fixedCustomer])

  const balance = toNumber(customer?.balance)
  const value = toNumber(amount)
  const remaining = Math.max(0, balance - value)
  const tooMuch = value > balance

  const mutation = useMutation({
    mutationFn: () => customerApi.payment(customer.id, { amount: value, payment_date: date, payment_method: method, notes: notes || null }),
    onSuccess: () => {
      toast.success(t('customers.paymentSuccess', { amount: money(value), name: customer.name }))
      invalidate()
      onDone?.()
      onClose()
    },
    onError: (err) => !err.errors && toast.error(err.message),
  })
  const errors = fieldErrors(mutation.error)

  const submit = async (e) => {
    e.preventDefault()
    if (!customer || value <= 0 || tooMuch) return
    const ok = await confirm({
      title: t('customers.paymentConfirm', { amount: money(value), name: customer.name }),
      message: `${t('customers.afterPayment')}: ${money(remaining)}`,
      confirmText: t('customers.receivePayment'),
    })
    if (ok) mutation.mutate()
  }

  const quick = [balance, 100, 500, 1000, 2000].filter((v, i) => v > 0 && (i === 0 || v < balance))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('customers.receivePayment')}
      footer={
        <Button type="submit" form="payment-form" variant="success" size="lg" block loading={mutation.isPending} disabled={!customer || value <= 0 || tooMuch}>
          {t('customers.receivePayment')} {value > 0 && `· ${money(value)}`}
        </Button>
      }
    >
      <form id="payment-form" onSubmit={submit} className="space-y-4">
        {!fixedCustomer && <CustomerPicker value={customer} onChange={setCustomer} withDuesOnly label={t('customers.name')} />}

        {customer && (
          <>
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">{t('customers.outstanding')}</p>
                <p className="text-2xl font-extrabold tabular-nums text-rose-600">{money(balance)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-500">{t('customers.afterPayment')}</p>
                <p className="text-2xl font-extrabold tabular-nums text-emerald-600">{money(remaining)}</p>
              </div>
            </div>

            {balance <= 0 ? (
              <p className="rounded-xl bg-emerald-50 p-3 text-center font-semibold text-emerald-700">{t('customers.noDues')}</p>
            ) : (
              <>
                <MoneyInput
                  label={t('customers.paymentAmount')}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  size="lg"
                  max={balance}
                  autoFocus
                  error={tooMuch ? t('errors.PAYMENT_EXCEEDS_BALANCE', { balance: money(balance) }) : errors.amount}
                />
                <div className="flex flex-wrap gap-2">
                  {quick.map((q, i) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setAmount(String(q))}
                      className="rounded-full bg-brand-50 px-4 py-2 text-[15px] font-semibold text-brand-800 hover:bg-brand-100"
                    >
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
          </>
        )}
      </form>
    </Modal>
  )
}

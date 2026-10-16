import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { BookPlus } from 'lucide-react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import { Input, MoneyInput } from './ui/Field'
import CustomerPicker from './CustomerPicker'
import { customerApi } from '../services/endpoints'
import { fieldErrors } from '../services/api'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { useInvalidateBusiness, useSettings } from '../hooks/queries'
import { useWhatsApp } from '../context/WhatsAppContext'
import { formatDate, isoDate, localName, money, toNumber } from '../utils/format'

/**
 * Add udhari directly to a customer's khata — just an amount, no products or stock.
 * If `customer` is not given, a customer picker is shown first.
 */
export default function AddUdhariModal({ open, onClose, customer: fixedCustomer, onDone }) {
  const { t } = useTranslation()
  const toast = useToast()
  const confirm = useConfirm()
  const invalidate = useInvalidateBusiness()
  const offerWhatsApp = useWhatsApp()
  const { data: settings } = useSettings()
  const [customer, setCustomer] = useState(fixedCustomer || null)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(isoDate())
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      setCustomer(fixedCustomer || null)
      setAmount('')
      setDate(isoDate())
      setNotes('')
    }
  }, [open, fixedCustomer])

  const balance = toNumber(customer?.balance)
  const value = toNumber(amount)

  const mutation = useMutation({
    mutationFn: () => customerApi.udhari(customer.id, { amount: value, udhari_date: date, notes: notes || null }),
    onSuccess: (res) => {
      toast.success(t('customers.udhariSuccess', { amount: money(value), name: customer.name }))
      invalidate()
      onDone?.()
      onClose()
      offerWhatsApp({
        name: customer.name,
        mobile: customer.mobile,
        message: t('whatsapp.udhariAdded', {
          name: customer.name,
          bar: localName(settings, 'bar_name') || t('app.name'),
          amount: money(value),
          date: formatDate(date),
          note: notes ? t('whatsapp.noteLine', { note: notes }) : '',
          balance: money(res.data.balance),
        }),
      })
    },
    onError: (err) => !err.errors && toast.error(err.message),
  })
  const errors = fieldErrors(mutation.error)

  const submit = async (e) => {
    e.preventDefault()
    if (!customer || value <= 0) return
    const ok = await confirm({
      title: t('customers.udhariConfirm', { amount: money(value), name: customer.name }),
      message: `${t('customers.afterUdhari')}: ${money(balance + value)}`,
      confirmText: t('customers.addUdhari'),
    })
    if (ok) mutation.mutate()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('customers.addUdhari')}
      footer={
        <Button type="submit" form="udhari-form" variant="gold" size="lg" block icon={BookPlus} loading={mutation.isPending} disabled={!customer || value <= 0}>
          {t('customers.addUdhari')} {value > 0 && `· ${money(value)}`}
        </Button>
      }
    >
      <form id="udhari-form" onSubmit={submit} className="space-y-4">
        {!fixedCustomer && <CustomerPicker value={customer} onChange={setCustomer} label={t('customers.name')} />}

        {customer && (
          <>
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">{t('customers.outstanding')}</p>
                <p className="text-2xl font-extrabold tabular-nums text-slate-900">{money(balance)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-500">{t('customers.afterUdhari')}</p>
                <p className="text-2xl font-extrabold tabular-nums text-rose-600">{money(balance + value)}</p>
              </div>
            </div>

            <MoneyInput label={t('customers.udhariAmount')} value={amount} onChange={(e) => setAmount(e.target.value)} size="lg" autoFocus error={errors.amount} />
            <div className="flex flex-wrap gap-2">
              {[100, 200, 500, 1000, 2000].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className="rounded-full bg-amber-50 px-4 py-2 text-[15px] font-semibold text-amber-800 hover:bg-amber-100"
                >
                  {money(q)}
                </button>
              ))}
            </div>
            <Input label={t('customers.whatFor')} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={255} optional error={errors.notes} />
            <Input label={t('common.date')} type="date" value={date} max={isoDate()} onChange={(e) => setDate(e.target.value)} error={errors.udhari_date} />
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{t('customers.udhariHint')}</p>
          </>
        )}
      </form>
    </Modal>
  )
}

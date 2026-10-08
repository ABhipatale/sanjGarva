import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import clsx from 'clsx'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Segmented from './ui/Segmented'
import { Input, MoneyInput } from './ui/Field'
import { expenseApi } from '../services/endpoints'
import { fieldErrors } from '../services/api'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { useExpenseCategories, useInvalidateBusiness } from '../hooks/queries'
import { isoDate, localName, money } from '../utils/format'

const METHODS = ['cash', 'upi', 'bank', 'other']

export default function ExpenseFormModal({ open, onClose, expense }) {
  const { t } = useTranslation()
  const toast = useToast()
  const confirm = useConfirm()
  const invalidate = useInvalidateBusiness()
  const { data: categories = [] } = useExpenseCategories()
  const editing = !!expense

  const [form, setForm] = useState({})
  useEffect(() => {
    if (open) {
      setForm(
        expense
          ? { expense_category_id: expense.expense_category_id, amount: expense.amount, expense_date: expense.expense_date, description: expense.description || '', payment_method: expense.payment_method }
          : { expense_category_id: null, amount: '', expense_date: isoDate(), description: '', payment_method: 'cash' },
      )
    }
  }, [open, expense])

  const done = (msg) => {
    toast.success(msg)
    invalidate()
    onClose()
  }

  const save = useMutation({
    mutationFn: (data) => (editing ? expenseApi.update(expense.id, data) : expenseApi.create(data)),
    onSuccess: () => done(t('expenses.saved')),
    onError: (err) => !err.errors && toast.error(err.message),
  })
  const remove = useMutation({
    mutationFn: () => expenseApi.remove(expense.id),
    onSuccess: () => done(t('expenses.deleted')),
    onError: (err) => toast.error(err.message),
  })
  const errors = fieldErrors(save.error)

  const submit = (e) => {
    e.preventDefault()
    save.mutate({ ...form, description: form.description || null })
  }

  const onDelete = async () => {
    if (await confirm({ title: t('expenses.deleteConfirm', { amount: money(expense.amount) }), danger: true, confirmText: t('common.delete') })) remove.mutate()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t('expenses.edit') : t('expenses.add')}
      footer={
        <div className="flex gap-3">
          {editing && <Button variant="secondary" size="lg" icon={Trash2} onClick={onDelete} loading={remove.isPending} aria-label={t('common.delete')} className="text-rose-600" />}
          <Button type="submit" form="expense-form" size="lg" block loading={save.isPending} disabled={!form.expense_category_id}>
            {t('common.save')}
          </Button>
        </div>
      }
    >
      <form id="expense-form" onSubmit={submit} className="space-y-4">
        <div>
          <p className="mb-2 text-[15px] font-semibold text-slate-700">{t('expenses.category')}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categories.filter((c) => c.is_active || c.id === form.expense_category_id).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setForm((f) => ({ ...f, expense_category_id: c.id }))}
                aria-pressed={form.expense_category_id === c.id}
                className={clsx(
                  'h-12 rounded-xl px-3 text-[15px] font-semibold ring-1 ring-inset transition',
                  form.expense_category_id === c.id ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50',
                )}
              >
                {localName(c)}
              </button>
            ))}
          </div>
          {errors.expense_category_id && <p className="mt-1.5 text-sm font-medium text-rose-600">{errors.expense_category_id}</p>}
        </div>
        <MoneyInput label={t('common.amount')} value={form.amount ?? ''} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} size="lg" error={errors.amount} required />
        <div>
          <p className="mb-1.5 text-[15px] font-semibold text-slate-700">{t('customers.paymentMethod')}</p>
          <Segmented scroll value={form.payment_method} onChange={(v) => setForm((f) => ({ ...f, payment_method: v }))} options={METHODS.map((m) => ({ value: m, label: t(`payment.${m}`) }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('common.date')} type="date" max={isoDate()} value={form.expense_date || ''} onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))} error={errors.expense_date} />
          <Input label={t('expenses.description')} value={form.description || ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} optional />
        </div>
      </form>
    </Modal>
  )
}

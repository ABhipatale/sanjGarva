import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Modal from './ui/Modal'
import Button from './ui/Button'
import { Input, MoneyInput, Textarea } from './ui/Field'
import { customerApi } from '../services/endpoints'
import { fieldErrors } from '../services/api'
import { useToast } from '../context/ToastContext'
import { useInvalidateBusiness } from '../hooks/queries'

const EMPTY = { name: '', mobile: '', address: '', opening_balance: '', notes: '' }

export default function CustomerFormModal({ open, onClose, onSaved, customer, initialName = '' }) {
  const { t } = useTranslation()
  const toast = useToast()
  const invalidate = useInvalidateBusiness()
  const [form, setForm] = useState(EMPTY)
  const editing = !!customer

  useEffect(() => {
    if (open) setForm(customer ? { ...EMPTY, ...customer, opening_balance: '' } : { ...EMPTY, name: /^\d+$/.test(initialName) ? '' : initialName, mobile: /^\d+$/.test(initialName) ? initialName : '' })
  }, [open, customer, initialName])

  const mutation = useMutation({
    mutationFn: (data) => (editing ? customerApi.update(customer.id, data) : customerApi.create(data)),
    onSuccess: (res) => {
      toast.success(t('customers.saved'))
      invalidate()
      onSaved?.(res.data)
    },
    onError: (err) => !err.errors && toast.error(err.message),
  })
  const errors = fieldErrors(mutation.error)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    const data = { name: form.name.trim(), mobile: form.mobile?.trim() || null, address: form.address || null, notes: form.notes || null }
    if (!editing) data.opening_balance = form.opening_balance || 0
    mutation.mutate(data)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t('customers.edit') : t('customers.add')}
      footer={
        <Button type="submit" form="customer-form" size="lg" block loading={mutation.isPending}>
          {t('common.save')}
        </Button>
      }
    >
      <form id="customer-form" onSubmit={submit} className="space-y-4">
        <Input label={t('customers.name')} value={form.name} onChange={set('name')} error={errors.name} required autoComplete="off" />
        <Input
          label={t('customers.mobile')}
          value={form.mobile || ''}
          onChange={set('mobile')}
          error={errors.mobile}
          type="tel"
          inputMode="tel"
          optional
          autoComplete="off"
        />
        {!editing && (
          <MoneyInput label={t('customers.openingBalance')} value={form.opening_balance} onChange={set('opening_balance')} error={errors.opening_balance} optional />
        )}
        <Input label={t('customers.address')} value={form.address || ''} onChange={set('address')} error={errors.address} optional />
        <Textarea label={t('common.notes')} value={form.notes || ''} onChange={set('notes')} optional />
      </form>
    </Modal>
  )
}

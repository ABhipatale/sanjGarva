import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Field'
import { categoryApi } from '../../services/endpoints'
import { fieldErrors } from '../../services/api'
import { useCategories } from '../../hooks/queries'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import { localName } from '../../utils/format'

const EMPTY = { name: '', name_mr: '', parent_id: '' }

export default function CategoryManager({ open, onClose }) {
  const { t } = useTranslation()
  const toast = useToast()
  const confirm = useConfirm()
  const qc = useQueryClient()
  const { data: categories = [] } = useCategories()
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)

  const refresh = () => qc.invalidateQueries({ queryKey: ['categories'] })

  const save = useMutation({
    mutationFn: (data) => (editing ? categoryApi.update(editing.id, data) : categoryApi.create(data)),
    onSuccess: () => {
      toast.success(t('products.categorySaved'))
      setForm(EMPTY)
      setEditing(null)
      refresh()
    },
    onError: (err) => !err.errors && toast.error(err.message),
  })
  const remove = useMutation({
    mutationFn: (id) => categoryApi.remove(id),
    onSuccess: () => {
      toast.success(t('products.deleted'))
      refresh()
    },
    onError: (err) => toast.error(err.message),
  })
  const errors = fieldErrors(save.error)

  const submit = (e) => {
    e.preventDefault()
    save.mutate({ name: form.name, name_mr: form.name_mr || null, parent_id: form.parent_id || null })
  }

  const edit = (c) => {
    setEditing(c)
    setForm({ name: c.name, name_mr: c.name_mr || '', parent_id: c.parent_id || '' })
  }

  const parents = categories.filter((c) => !c.parent_id)
  const childrenOf = (id) => categories.filter((c) => c.parent_id === id)

  const row = (c, child = false) => (
    <li key={c.id} className={`flex items-center gap-2 py-2.5 ${child ? 'pl-6' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className={`truncate ${child ? 'font-medium' : 'font-bold'} text-slate-900`}>{localName(c)}</p>
        <p className="text-xs text-slate-500">
          {c.name_mr && c.name} · {c.products_count} {t('nav.products')}
        </p>
      </div>
      <button onClick={() => edit(c)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={t('common.edit')}>
        <Pencil className="size-4" />
      </button>
      <button
        onClick={async () => (await confirm({ title: t('products.categoryDeleteConfirm', { name: localName(c) }), danger: true, confirmText: t('common.delete') })) && remove.mutate(c.id)}
        className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
        aria-label={t('common.delete')}
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  )

  return (
    <Modal open={open} onClose={onClose} title={t('products.manageCategories')} size="lg">
      <form onSubmit={submit} className="space-y-3 rounded-2xl bg-slate-50 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('products.categoryName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} required />
          <Input label={t('products.categoryNameMr')} value={form.name_mr} onChange={(e) => setForm({ ...form, name_mr: e.target.value })} />
        </div>
        <Select label={t('products.parentCategory')} value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}>
          <option value="">{t('products.none')}</option>
          {parents.filter((p) => p.id !== editing?.id).map((p) => (
            <option key={p.id} value={p.id}>
              {localName(p)}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          {editing && (
            <Button variant="secondary" onClick={() => { setEditing(null); setForm(EMPTY) }}>
              {t('common.cancel')}
            </Button>
          )}
          <Button type="submit" icon={editing ? Pencil : Plus} loading={save.isPending} block>
            {editing ? t('common.save') : t('products.addCategory')}
          </Button>
        </div>
      </form>
      <ul className="mt-3 divide-y divide-slate-100">
        {parents.map((p) => [row(p), ...childrenOf(p.id).map((c) => row(c, true))])}
      </ul>
    </Modal>
  )
}

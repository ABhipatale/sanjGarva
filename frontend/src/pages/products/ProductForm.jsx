import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Save, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input, MoneyInput, Select, Toggle } from '../../components/ui/Field'
import { PageLoader, ErrorState } from '../../components/ui/States'
import { productApi } from '../../services/endpoints'
import { fieldErrors } from '../../services/api'
import { useCategories, useInvalidateBusiness, useSettings } from '../../hooks/queries'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import { localName, money, percent, toNumber } from '../../utils/format'

const UNITS = ['bottle', 'can', 'case', 'box', 'piece', 'peg']

export default function ProductForm() {
  const { id } = useParams()
  const editing = !!id
  const query = useQuery({ queryKey: ['products', 'detail', id], queryFn: () => productApi.get(id).then((r) => r.data), enabled: editing, staleTime: 0 })
  if (editing && query.isPending) return <PageLoader />
  if (editing && query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />
  return <Form product={query.data} />
}

function Form({ product }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const invalidate = useInvalidateBusiness()
  const { data: categories = [] } = useCategories()
  const { data: settings } = useSettings()
  const editing = !!product

  const [form, setForm] = useState(() =>
    product
      ? {
          ...product,
          category_id: product.category_id || '',
          sub_category_id: product.sub_category_id || '',
          name_mr: product.name_mr || '',
          brand: product.brand || '',
          bottle_size: product.bottle_size || '',
        }
      : { name: '', name_mr: '', category_id: '', sub_category_id: '', brand: '', unit: 'bottle', bottle_size: '', min_stock: '', cost_price: '', selling_price: '', opening_store: '', opening_shop: '', is_active: true },
  )
  useEffect(() => {
    if (!editing && form.min_stock === '' && settings) setForm((f) => ({ ...f, min_stock: settings.low_stock_default }))
  }, [settings, editing, form.min_stock])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const profit = toNumber(form.selling_price) - toNumber(form.cost_price)
  const margin = toNumber(form.selling_price) > 0 ? (profit / toNumber(form.selling_price)) * 100 : 0

  const save = useMutation({
    mutationFn: (data) => (editing ? productApi.update(product.id, data) : productApi.create(data)),
    onSuccess: () => {
      toast.success(t('products.saved'))
      invalidate('categories')
      navigate('/products')
    },
    onError: (err) => !err.errors && toast.error(err.message),
  })
  const remove = useMutation({
    mutationFn: () => productApi.remove(product.id),
    onSuccess: () => {
      toast.success(t('products.deleted'))
      invalidate('categories')
      navigate('/products')
    },
    onError: (err) => toast.error(err.code === 'HAS_HISTORY' ? t('products.cannotDelete') : err.message),
  })
  const errors = fieldErrors(save.error)

  const submit = (e) => {
    e.preventDefault()
    const data = {
      name: form.name,
      name_mr: form.name_mr || null,
      category_id: form.category_id || null,
      sub_category_id: form.sub_category_id || null,
      brand: form.brand || null,
      unit: form.unit,
      bottle_size: form.bottle_size || null,
      min_stock: form.min_stock === '' ? 0 : form.min_stock,
      cost_price: form.cost_price || 0,
      selling_price: form.selling_price || 0,
      is_active: !!form.is_active,
    }
    if (!editing) {
      data.opening_store = form.opening_store || 0
      data.opening_shop = form.opening_shop || 0
    }
    save.mutate(data)
  }

  const onDelete = async () => {
    if (await confirm({ title: t('products.deleteConfirm', { name: localName(product) }), message: t('products.cannotDelete'), danger: true, confirmText: t('common.delete') })) remove.mutate()
  }

  const parents = categories.filter((c) => !c.parent_id)
  const subs = categories.filter((c) => form.category_id && c.parent_id === Number(form.category_id))

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={editing ? t('products.edit') : t('products.add')}
        back="/products"
        actions={editing && <Button variant="secondary" size="icon" icon={Trash2} className="text-rose-600" onClick={onDelete} loading={remove.isPending} aria-label={t('common.delete')} />}
      />
      <form onSubmit={submit} className="space-y-4">
        <Card className="space-y-4 p-4 sm:p-5">
          <Input label={t('products.name')} value={form.name} onChange={set('name')} error={errors.name} required autoFocus={!editing} placeholder="Kingfisher Premium" />
          <Input label={t('products.nameMr')} value={form.name_mr} onChange={set('name_mr')} error={errors.name_mr} optional placeholder="किंगफिशर प्रीमियम" />
          <div className="grid grid-cols-2 gap-3">
            <Select label={t('products.category')} value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value, sub_category_id: '' }))} error={errors.category_id}>
              <option value="">{t('common.select')}</option>
              {parents.map((c) => (
                <option key={c.id} value={c.id}>{localName(c)}</option>
              ))}
            </Select>
            {subs.length > 0 ? (
              <Select label={t('products.subCategory')} value={form.sub_category_id} onChange={set('sub_category_id')} optional>
                <option value="">{t('common.select')}</option>
                {subs.map((c) => (
                  <option key={c.id} value={c.id}>{localName(c)}</option>
                ))}
              </Select>
            ) : (
              <Input label={t('products.brand')} value={form.brand} onChange={set('brand')} optional />
            )}
          </div>
          {subs.length > 0 && <Input label={t('products.brand')} value={form.brand} onChange={set('brand')} optional />}
        </Card>

        <Card className="space-y-4 p-4 sm:p-5">
          <div>
            <p className="mb-2 text-[15px] font-semibold text-slate-700">{t('products.unit')}</p>
            <div className="grid grid-cols-3 gap-2">
              {UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, unit: u }))}
                  aria-pressed={form.unit === u}
                  className={clsx('h-11 rounded-xl text-[15px] font-semibold ring-1 ring-inset', form.unit === u ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-slate-700 ring-slate-300')}
                >
                  {t(`products.units.${u}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('products.size')} value={form.bottle_size} onChange={set('bottle_size')} placeholder={t('products.sizePlaceholder')} optional />
            <Input label={t('products.minStock')} type="number" inputMode="numeric" min="0" value={form.min_stock} onChange={set('min_stock')} error={errors.min_stock} />
          </div>
        </Card>

        <Card className="space-y-4 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3">
            <MoneyInput label={t('products.costPrice')} value={form.cost_price} onChange={set('cost_price')} error={errors.cost_price} required />
            <MoneyInput label={t('products.sellingPrice')} value={form.selling_price} onChange={set('selling_price')} error={errors.selling_price} required />
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-emerald-50 p-3 text-center">
            <div>
              <p className="text-sm text-emerald-800">{t('products.profitPerUnit')}</p>
              <p className={clsx('text-xl font-extrabold tabular-nums', profit < 0 ? 'text-rose-600' : 'text-emerald-700')}>{money(profit)}</p>
            </div>
            <div>
              <p className="text-sm text-emerald-800">{t('products.margin')}</p>
              <p className="text-xl font-extrabold tabular-nums text-emerald-700">{percent(margin)}</p>
            </div>
          </div>
          {editing && toNumber(product.avg_cost) > 0 && (
            <p className="text-sm text-slate-500">
              {t('products.avgCost')}: <b>{money(product.avg_cost)}</b>
            </p>
          )}
        </Card>

        {!editing ? (
          <Card className="space-y-3 p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('products.openingStore')} type="number" inputMode="numeric" min="0" value={form.opening_store} onChange={set('opening_store')} error={errors.opening_store} />
              <Input label={t('products.openingShop')} type="number" inputMode="numeric" min="0" value={form.opening_shop} onChange={set('opening_shop')} error={errors.opening_shop} />
            </div>
            <p className="text-sm text-slate-500">{t('products.openingHint')}</p>
          </Card>
        ) : (
          <Toggle label={form.is_active ? t('common.active') : t('common.inactive')} checked={!!form.is_active} onChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
        )}

        <Button type="submit" size="xl" block icon={Save} loading={save.isPending}>
          {t('common.save')}
        </Button>
      </form>
    </div>
  )
}

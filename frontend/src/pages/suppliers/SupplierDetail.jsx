import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Banknote, MessageCircle, PackagePlus, Pencil, Phone, Trash2, Truck } from 'lucide-react'
import clsx from 'clsx'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState, ErrorState, PageLoader, QueryState } from '../../components/ui/States'
import SupplierFormModal from '../../components/SupplierFormModal'
import PaySupplierModal from '../../components/PaySupplierModal'
import { supplierApi } from '../../services/endpoints'
import { useInvalidateBusiness, useSettings } from '../../hooks/queries'
import { useWhatsApp } from '../../context/WhatsAppContext'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import { formatDate, localName, money, num, toNumber } from '../../utils/format'

export default function SupplierDetail() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const invalidate = useInvalidateBusiness()
  const offerWhatsApp = useWhatsApp()
  const { data: settings } = useSettings()
  const [editing, setEditing] = useState(false)
  const [paying, setPaying] = useState(false)

  const supplier = useQuery({ queryKey: ['supplier', String(id)], queryFn: () => supplierApi.get(id).then((r) => r.data) })
  const ledger = useQuery({ queryKey: ['supplier', String(id), 'ledger'], queryFn: () => supplierApi.ledger(id).then((r) => r.data) })

  const remove = useMutation({
    mutationFn: () => supplierApi.remove(id),
    onSuccess: () => {
      toast.success(t('suppliers.deleted'))
      invalidate()
      navigate('/suppliers', { replace: true })
    },
    onError: (err) => toast.error(err.message),
  })

  if (supplier.isPending) return <PageLoader />
  if (supplier.isError) return <ErrorState error={supplier.error} onRetry={supplier.refetch} />
  const s = supplier.data
  const due = toNumber(s.balance)

  const onDelete = async () => {
    if (await confirm({ title: t('suppliers.deleteConfirm', { name: s.name }), danger: true, confirmText: t('common.delete') })) remove.mutate()
  }

  const sendStatement = () =>
    offerWhatsApp({
      name: s.name,
      mobile: s.mobile,
      message: t('whatsapp.supplierStatement', {
        name: s.name,
        bar: localName(settings, 'bar_name') || t('app.name'),
        total: money(s.total_purchase),
        paid: money(s.total_paid),
        balance: money(s.balance),
      }),
    })

  const describe = (e) => {
    if (e.type === 'purchase' && e.product) return `${localName(e.product)} × ${num(e.quantity)}`
    if (e.type === 'payment') return [t('suppliers.types.payment'), e.payment_method && t(`payment.${e.payment_method}`)].filter(Boolean).join(' · ')
    return t(`suppliers.types.${e.type}`, e.type)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title={s.name}
        subtitle={s.mobile}
        back="/suppliers"
        actions={
          <>
            <Button variant="secondary" size="icon" icon={MessageCircle} onClick={sendStatement} aria-label={t('customers.whatsapp')} className="text-emerald-600" />
            {s.mobile && <Button variant="secondary" size="icon" icon={Phone} onClick={() => (window.location.href = `tel:${s.mobile}`)} aria-label={t('customers.callCustomer')} />}
            <Button variant="secondary" size="icon" icon={Pencil} onClick={() => setEditing(true)} aria-label={t('common.edit')} />
            <Button variant="secondary" size="icon" icon={Trash2} onClick={onDelete} loading={remove.isPending} aria-label={t('common.delete')} className="text-rose-600" />
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-slate-100 text-center">
          <div className="p-3 sm:p-4">
            <p className="text-sm font-semibold text-slate-500">{t('suppliers.totalPurchase')}</p>
            <p className="text-xl font-extrabold tabular-nums text-slate-900 sm:text-2xl">{money(s.total_purchase)}</p>
          </div>
          <div className="p-3 sm:p-4">
            <p className="text-sm font-semibold text-slate-500">{t('suppliers.paid')}</p>
            <p className="text-xl font-extrabold tabular-nums text-emerald-600 sm:text-2xl">{money(s.total_paid)}</p>
          </div>
          <div className="bg-orange-50/60 p-3 sm:p-4">
            <p className="text-sm font-semibold text-slate-500">{t('suppliers.unpaid')}</p>
            <p className={clsx('text-xl font-extrabold tabular-nums sm:text-2xl', due > 0 ? 'text-orange-600' : 'text-emerald-600')}>{money(due)}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button size="lg" variant="success" icon={Banknote} onClick={() => setPaying(true)} disabled={due <= 0}>
          {t('suppliers.pay')}
        </Button>
        <Button size="lg" variant="soft" icon={PackagePlus} to={`/stock/add?supplier=${s.id}`}>
          {t('suppliers.addStock')}
        </Button>
      </div>

      <h2 className="text-[17px] font-bold text-slate-900">{t('suppliers.ledger')}</h2>
      <QueryState query={ledger} isEmpty={(d) => d.entries.length === 0} empty={<EmptyState icon={Truck} title={t('suppliers.noLedger')} />}>
        {(d) => (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-200/70">
            {d.entries.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-900">{describe(e)}</p>
                  <p className="truncate text-sm text-slate-500">
                    {formatDate(e.date)}
                    {e.invoice_no && ` · ${e.invoice_no}`}
                    {e.notes && e.notes !== e.invoice_no && ` · ${e.notes}`}
                  </p>
                </div>
                <div className="text-right">
                  {toNumber(e.debit) > 0 && <p className="font-extrabold tabular-nums text-orange-600">+{money(e.debit)}</p>}
                  {toNumber(e.credit) > 0 && <p className="font-extrabold tabular-nums text-emerald-600">−{money(e.credit)}</p>}
                  <p className="text-xs text-slate-500">
                    {t('suppliers.unpaid')}: {money(e.balance)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryState>

      <SupplierFormModal open={editing} supplier={s} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} />
      <PaySupplierModal open={paying} supplier={s} onClose={() => setPaying(false)} />
    </div>
  )
}

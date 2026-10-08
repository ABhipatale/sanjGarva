import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { FileDown, HandCoins, MessageCircle, Pencil, Phone, Printer, Share2, ShoppingCart, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import PeriodFilter from '../../components/ui/PeriodFilter'
import DataTable from '../../components/ui/DataTable'
import { Card } from '../../components/ui/Card'
import { EmptyState, ErrorState, PageLoader, QueryState } from '../../components/ui/States'
import CustomerFormModal from '../../components/CustomerFormModal'
import ReceivePaymentModal from '../../components/ReceivePaymentModal'
import SaleDetailModal from '../../components/SaleDetailModal'
import { customerApi } from '../../services/endpoints'
import { useCustomer, useInvalidateBusiness, useSettings } from '../../hooks/queries'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import { formatDate, formatDateTime, initials, localName, money, toNumber } from '../../utils/format'

export default function CustomerDetail() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const invalidate = useInvalidateBusiness()
  const { data: settings } = useSettings()
  const [period, setPeriod] = useState({ period: 'all' })
  const [editing, setEditing] = useState(false)
  const [paying, setPaying] = useState(false)
  const [saleId, setSaleId] = useState(null)

  const customerQuery = useCustomer(id)
  const ledger = useQuery({
    queryKey: ['ledger', id, period],
    queryFn: () => customerApi.ledger(id, period.period === 'all' ? {} : period).then((r) => r.data),
  })

  const remove = useMutation({
    mutationFn: () => customerApi.remove(id),
    onSuccess: () => {
      toast.success(t('customers.deleted'))
      invalidate()
      navigate('/customers', { replace: true })
    },
    onError: (err) => toast.error(err.message),
  })

  if (customerQuery.isPending) return <PageLoader />
  if (customerQuery.isError) return <ErrorState error={customerQuery.error} onRetry={customerQuery.refetch} />
  const c = customerQuery.data
  const due = toNumber(c.balance)
  const bar = localName(settings, 'bar_name') || t('app.name')
  const reminder = t('customers.shareText', { name: c.name, bar, amount: money(due) })
  const phone = (c.mobile || '').replace(/[^\d]/g, '')
  const waNumber = phone.length === 10 ? `91${phone}` : phone

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: bar, text: reminder })
      } catch {
        /* cancelled */
      }
    } else {
      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(reminder)}`, '_blank', 'noopener')
    }
  }

  const typeLabel = (e) =>
    ({ opening: t('customers.openingRow'), sale: t('customers.purchase'), payment: t('customers.payment'), sale_void: t('customers.saleVoid') })[e.type] || e.type

  return (
    <div className="space-y-4">
      <PageHeader
        title={c.name}
        subtitle={c.mobile}
        back="/customers"
        actions={
          <>
            <Button variant="secondary" size="icon" icon={Pencil} onClick={() => setEditing(true)} aria-label={t('common.edit')} />
            <Button
              variant="secondary"
              size="icon"
              icon={Trash2}
              className="text-rose-600"
              aria-label={t('common.delete')}
              onClick={async () => (await confirm({ title: t('customers.deleteConfirm', { name: c.name }), danger: true, confirmText: t('common.delete') })) && remove.mutate()}
            />
          </>
        }
      />

      <Card className="print-area overflow-hidden">
        <div className="hidden p-4 text-center print:block">
          <p className="text-xl font-bold">{bar}</p>
          <p>{t('customers.ledger')} — {c.name} {c.mobile && `(${c.mobile})`}</p>
        </div>
        <div className="flex items-center gap-4 p-4 sm:p-5 no-print">
          <span className="flex size-14 items-center justify-center rounded-full bg-brand-100 text-xl font-extrabold text-brand-800">{initials(c.name)}</span>
          <div className="flex flex-1 flex-wrap gap-2">
            {c.mobile && (
              <>
                <Button variant="soft" size="sm" icon={Phone} onClick={() => (window.location.href = `tel:${c.mobile}`)}>
                  {t('customers.callCustomer')}
                </Button>
                <Button variant="soft" size="sm" icon={MessageCircle} onClick={() => window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(reminder)}`, '_blank', 'noopener')}>
                  {t('customers.whatsapp')}
                </Button>
              </>
            )}
            <Button variant="soft" size="sm" icon={Share2} onClick={share}>
              {t('common.share')}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 text-center">
          <div className="p-3 sm:p-4">
            <p className="text-sm font-semibold text-slate-500">{t('customers.totalUdhari')}</p>
            <p className="text-xl font-extrabold tabular-nums sm:text-2xl">{money(c.total_debit)}</p>
          </div>
          <div className="p-3 sm:p-4">
            <p className="text-sm font-semibold text-slate-500">{t('customers.paid')}</p>
            <p className="text-xl font-extrabold tabular-nums text-emerald-600 sm:text-2xl">{money(c.total_credit)}</p>
          </div>
          <div className="bg-rose-50/60 p-3 sm:p-4">
            <p className="text-sm font-semibold text-slate-500">{t('customers.remaining')}</p>
            <p className={clsx('text-xl font-extrabold tabular-nums sm:text-2xl', due > 0 ? 'text-rose-600' : 'text-emerald-600')}>{money(due)}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 no-print">
        <Button size="lg" variant="success" icon={HandCoins} onClick={() => setPaying(true)} disabled={due <= 0}>
          {t('customers.receivePayment')}
        </Button>
        <Button size="lg" variant="gold" icon={ShoppingCart} to={`/sales/new?customer=${c.id}`}>
          {t('sales.udhari')} {t('nav.sales')}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2 no-print">
        <h2 className="text-[17px] font-bold text-slate-900">{t('customers.ledger')}</h2>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={Printer} onClick={() => window.print()}>{t('common.print')}</Button>
          <Button variant="secondary" size="sm" icon={FileDown} onClick={() => window.print()} className="hidden sm:inline-flex">{t('common.downloadPdf')}</Button>
        </div>
      </div>
      <PeriodFilter value={period} onChange={setPeriod} allowAll />

      <QueryState query={ledger} isEmpty={(d) => d.entries.length === 0 && toNumber(d.opening_balance) === 0} empty={<EmptyState title={t('customers.noLedger')} />}>
        {(d) => {
          const rows = [
            ...(period.period !== 'all' ? [{ id: 'opening', date: d.range.from, type: 'opening', debit: null, credit: null, balance: d.opening_balance }] : []),
            ...d.entries,
          ]
          return (
            <DataTable
              className="print-area"
              rows={rows}
              onRowClick={(e) => e.sale_id && setSaleId(e.sale_id)}
              columns={[
                { key: 'date', header: t('common.date'), render: (e) => (e.id === 'opening' ? formatDate(e.date) : formatDateTime(e.date)) },
                {
                  key: 'desc',
                  header: t('customers.description'),
                  render: (e) => (
                    <span>
                      <b>{typeLabel(e)}</b>
                      {e.invoice_no && <span className="text-slate-500"> · {e.invoice_no}</span>}
                      {e.payment_method && <span className="text-slate-500"> · {t(`payment.${e.payment_method}`)}</span>}
                    </span>
                  ),
                },
                { key: 'debit', header: t('customers.debit'), align: 'right', render: (e) => (toNumber(e.debit) ? <span className="text-rose-600">{money(e.debit)}</span> : '–') },
                { key: 'credit', header: t('customers.credit'), align: 'right', render: (e) => (toNumber(e.credit) ? <span className="text-emerald-600">{money(e.credit)}</span> : '–') },
                { key: 'balance', header: t('customers.balance'), align: 'right', render: (e) => <b>{money(e.balance)}</b> },
              ]}
              footer={
                <tr>
                  <td className="px-4 py-3" colSpan={2}>{t('common.total')}</td>
                  <td className="px-4 py-3 text-right text-rose-600">{money(d.total_debit)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{money(d.total_credit)}</td>
                  <td className="px-4 py-3 text-right">{money(d.closing_balance)}</td>
                </tr>
              }
              renderCard={(e) => (
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900">
                      {typeLabel(e)} {e.invoice_no && <span className="font-normal text-slate-500">· {e.invoice_no}</span>}
                    </p>
                    <p className="text-sm text-slate-500">{e.id === 'opening' ? formatDate(e.date) : formatDateTime(e.date)}</p>
                  </div>
                  <div className="text-right">
                    {toNumber(e.debit) > 0 && <p className="font-extrabold tabular-nums text-rose-600">+{money(e.debit)}</p>}
                    {toNumber(e.credit) > 0 && <p className="font-extrabold tabular-nums text-emerald-600">−{money(e.credit)}</p>}
                    <p className="text-xs text-slate-500">
                      {t('customers.balance')}: {money(e.balance)}
                    </p>
                  </div>
                </div>
              )}
            />
          )
        }}
      </QueryState>

      <CustomerFormModal open={editing} customer={c} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} />
      <ReceivePaymentModal open={paying} customer={c} onClose={() => setPaying(false)} />
      <SaleDetailModal saleId={saleId} onClose={() => setSaleId(null)} />
    </div>
  )
}

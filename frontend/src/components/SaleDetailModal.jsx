import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Ban, Printer } from 'lucide-react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import { Badge, PaymentBadge } from './ui/Badge'
import { Input } from './ui/Field'
import { PageLoader, ErrorState } from './ui/States'
import { saleApi } from '../services/endpoints'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { useInvalidateBusiness, useSettings } from '../hooks/queries'
import { formatDateTime, localName, money, num } from '../utils/format'

export default function SaleDetailModal({ saleId, onClose }) {
  const { t } = useTranslation()
  const toast = useToast()
  const confirm = useConfirm()
  const invalidate = useInvalidateBusiness()
  const { data: settings } = useSettings()
  const [reason, setReason] = useState('')

  const query = useQuery({ queryKey: ['sales', 'detail', saleId], queryFn: () => saleApi.get(saleId).then((r) => r.data), enabled: !!saleId })
  const sale = query.data

  const voidMutation = useMutation({
    mutationFn: () => saleApi.void(saleId, reason || null),
    onSuccess: () => {
      toast.success(t('sales.voided'))
      invalidate()
      onClose()
    },
    onError: (err) => toast.error(err.message),
  })

  const onVoid = async () => {
    const ok = await confirm({
      title: t('sales.void'),
      message: t('sales.voidConfirm'),
      danger: true,
      confirmText: t('sales.void'),
      children: (
        <div className="mt-4 text-left">
          <Input label={t('sales.voidReason')} defaultValue="" onChange={(e) => setReason(e.target.value)} optional />
        </div>
      ),
    })
    if (ok) voidMutation.mutate()
  }

  return (
    <Modal open={!!saleId} onClose={onClose} title={sale ? `${t('sales.bill')} ${sale.invoice_no}` : t('sales.detail')}>
      {query.isPending ? (
        <PageLoader />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={query.refetch} />
      ) : (
        <div className="print-area">
          <div className="mb-3 hidden text-center print:block">
            <p className="text-xl font-bold">{localName(settings, 'bar_name')}</p>
            {settings?.address && <p className="text-sm">{settings.address}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>{formatDateTime(sale.sold_at)}</span>
            <PaymentBadge method={sale.payment_method} />
            {sale.status === 'void' && <Badge tone="red">{t('sales.cancelled')}</Badge>}
          </div>
          {sale.customer && <p className="mt-2 text-[16px] font-semibold text-slate-800">{sale.customer.name} {sale.customer.mobile && <span className="font-normal text-slate-500">· {sale.customer.mobile}</span>}</p>}

          <ul className="mt-4 divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
            {sale.items.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{i.product_name}</p>
                  <p className="text-sm text-slate-500">
                    {num(i.quantity)} × {money(i.unit_price)}
                  </p>
                </div>
                <p className="font-bold tabular-nums">{money(i.line_total)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-1.5 rounded-2xl bg-slate-50 p-4 text-[15px]">
            <div className="flex justify-between text-lg font-extrabold text-slate-900">
              <span>{t('sales.total')}</span>
              <span className="tabular-nums">{money(sale.total_amount)}</span>
            </div>
            <div className="flex justify-between text-slate-600 no-print">
              <span>{t('sales.cost')}</span>
              <span className="tabular-nums">{money(sale.total_cost)}</span>
            </div>
            <div className="flex justify-between font-semibold text-emerald-700 no-print">
              <span>{t('sales.profit')}</span>
              <span className="tabular-nums">{money(sale.profit)}</span>
            </div>
          </div>
          {sale.void_reason && <p className="mt-3 text-sm text-rose-600">{t('sales.voidReason')}: {sale.void_reason}</p>}

          <div className="mt-5 grid grid-cols-2 gap-3 no-print">
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
              {t('common.print')}
            </Button>
            {sale.status !== 'void' && (
              <Button variant="secondary" icon={Ban} className="text-rose-600" onClick={onVoid} loading={voidMutation.isPending}>
                {t('sales.void')}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

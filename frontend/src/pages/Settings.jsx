import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Download, FileSpreadsheet, ImageUp, KeyRound, Languages, LogOut, Save, Smartphone, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Input } from '../components/ui/Field'
import { PageLoader } from '../components/ui/States'
import Logo from '../components/Logo'
import { authApi, reportApi, settingsApi } from '../services/endpoints'
import { fieldErrors } from '../services/api'
import { useSettings } from '../hooks/queries'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { LANGUAGES } from '../locales'

const EXPORTS = [
  ['sales', 'exportSales'],
  ['sale-items', 'exportSaleItems'],
  ['customers', 'exportCustomers'],
  ['udhari', 'exportUdhari'],
  ['expenses', 'exportExpenses'],
  ['stock', 'exportStock'],
  ['movements', 'exportMovements'],
  ['purchases', 'exportPurchases'],
]

export default function Settings() {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const confirm = useConfirm()
  const qc = useQueryClient()
  const { logout, user } = useAuth()
  const { canInstall, install } = useInstallPrompt()
  const { data: settings, isPending } = useSettings()
  const fileRef = useRef(null)
  const [form, setForm] = useState(null)
  const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [exporting, setExporting] = useState(null)

  useEffect(() => {
    if (settings && !form) setForm(settings)
  }, [settings, form])

  const onSaved = (res) => {
    qc.setQueryData(['settings'], res.data)
    toast.success(t('settings.saved'))
  }
  const save = useMutation({ mutationFn: settingsApi.update, onSuccess: onSaved, onError: (e) => !e.errors && toast.error(e.message) })
  const upload = useMutation({ mutationFn: settingsApi.uploadLogo, onSuccess: onSaved, onError: (e) => toast.error(fieldErrors(e).logo || e.message) })
  const removeLogo = useMutation({ mutationFn: settingsApi.removeLogo, onSuccess: onSaved })
  const changePw = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      toast.success(t('auth.passwordChanged'))
      setPw({ current_password: '', password: '', password_confirmation: '' })
    },
    onError: (e) => !e.errors && toast.error(e.message),
  })

  if (isPending || !form) return <PageLoader />
  const errors = fieldErrors(save.error)
  const pwErrors = fieldErrors(changePw.error)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    const { bar_name, bar_name_mr, phone, address, gstin, currency, low_stock_default } = form
    save.mutate({ bar_name, bar_name_mr, phone, address, gstin, currency, low_stock_default })
  }

  const doExport = async (type) => {
    setExporting(type)
    try {
      await reportApi.export(type)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title={t('settings.title')} />

      <Card>
        <CardHeader title={t('common.language')} icon={Languages} />
        <div className="grid grid-cols-2 gap-2 p-4 sm:p-5">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => i18n.changeLanguage(l.code)}
              aria-pressed={i18n.language === l.code}
              className={clsx('h-14 rounded-2xl text-lg font-bold ring-1 ring-inset', i18n.language === l.code ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-slate-700 ring-slate-300')}
            >
              {l.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title={t('settings.business')} />
        <form onSubmit={submit} className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <Logo className="size-24" />
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])}
              />
              <Button variant="soft" icon={ImageUp} onClick={() => fileRef.current?.click()} loading={upload.isPending}>
                {t('settings.uploadLogo')}
              </Button>
              {settings.logo_url && <Button variant="ghost" icon={Trash2} onClick={() => removeLogo.mutate()} aria-label={t('common.delete')} />}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={t('settings.barName')} value={form.bar_name || ''} onChange={set('bar_name')} error={errors.bar_name} required />
            <Input label={t('settings.barNameMr')} value={form.bar_name_mr || ''} onChange={set('bar_name_mr')} error={errors.bar_name_mr} />
            <Input label={t('settings.phone')} value={form.phone || ''} onChange={set('phone')} type="tel" />
            <Input label={t('settings.gstin')} value={form.gstin || ''} onChange={set('gstin')} />
          </div>
          <Input label={t('settings.address')} value={form.address || ''} onChange={set('address')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('settings.currency')} value={form.currency || ''} onChange={set('currency')} error={errors.currency} maxLength={5} />
            <Input label={t('settings.lowStockDefault')} type="number" inputMode="numeric" min="0" value={form.low_stock_default} onChange={set('low_stock_default')} error={errors.low_stock_default} />
          </div>
          <Button type="submit" size="lg" block icon={Save} loading={save.isPending}>
            {t('common.save')}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title={t('settings.backup')} icon={FileSpreadsheet} />
        <div className="p-4 sm:p-5">
          <p className="mb-3 text-[15px] text-slate-500">{t('settings.backupHint')}</p>
          <div className="grid grid-cols-2 gap-2">
            {EXPORTS.map(([type, key]) => (
              <Button key={type} variant="secondary" icon={Download} onClick={() => doExport(type)} loading={exporting === type} className="justify-start">
                {t(`settings.${key}`)}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {canInstall && (
        <Card className="flex items-center gap-4 p-4 sm:p-5">
          <Smartphone className="size-10 text-brand-600" aria-hidden />
          <p className="flex-1 text-[15px] text-slate-600">{t('settings.installHint')}</p>
          <Button onClick={install}>{t('settings.install')}</Button>
        </Card>
      )}

      <Card>
        <CardHeader title={`${t('settings.account')} · ${user?.name}`} icon={KeyRound} />
        <form
          onSubmit={(e) => {
            e.preventDefault()
            changePw.mutate(pw)
          }}
          className="space-y-3 p-4 sm:p-5"
        >
          <p className="text-sm text-slate-500">{[user?.mobile, user?.email].filter(Boolean).join(' · ')}</p>
          <Input label={t('auth.currentPassword')} type="password" autoComplete="current-password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} error={pwErrors.current_password} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t('auth.newPassword')} type="password" autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} error={pwErrors.password} />
            <Input label={t('auth.confirmPassword')} type="password" autoComplete="new-password" value={pw.password_confirmation} onChange={(e) => setPw({ ...pw, password_confirmation: e.target.value })} />
          </div>
          <Button type="submit" variant="secondary" icon={KeyRound} loading={changePw.isPending} disabled={!pw.current_password || !pw.password}>
            {t('auth.changePassword')}
          </Button>
        </form>
      </Card>

      <Button
        variant="secondary"
        size="lg"
        block
        icon={LogOut}
        className="text-rose-600"
        onClick={async () => (await confirm({ title: t('auth.logoutConfirm'), danger: true, confirmText: t('nav.logout') })) && logout()}
      >
        {t('nav.logout')}
      </Button>
      <p className="pb-4 text-center text-xs text-slate-400">Sanj Garva · संज गरवा · v1.0</p>
    </div>
  )
}

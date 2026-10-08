import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import LanguageToggle from '../components/LanguageToggle'
import logo from '../assets/logo.webp'
import { useAuth } from '../context/AuthContext'
import { fieldErrors } from '../services/api'

export default function Login() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ login: '', password: '', remember: true })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(form)
      navigate(location.state?.from?.pathname || '/', { replace: true })
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const errors = fieldErrors(error)
  const general = error && !error.errors ? error.message : null

  return (
    <div className="relative flex min-h-dvh flex-col bg-linear-to-br from-brand-950 via-brand-900 to-brand-800">
      <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-gold-400/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-brand-500/30 blur-3xl" aria-hidden />

      <div className="relative flex justify-end p-4 pt-[calc(env(safe-area-inset-top)+16px)]">
        <LanguageToggle dark />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 pb-10">
        <div className="mb-6 flex flex-col items-center text-center text-white">
          <img src={logo} alt="Saanj Garva" className="size-36 object-contain drop-shadow-2xl" />
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">सांज गारवा</h1>
          <p className="text-lg font-semibold text-gold-300">Saanj Garva</p>
          <p className="mt-1 text-sm text-brand-200">{t('app.tagline')}</p>
        </div>

        <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-slide-up" noValidate>
          <h2 className="text-xl font-extrabold text-slate-900">{t('auth.loginTitle')}</h2>
          <p className="mb-5 text-[15px] text-slate-500">{t('auth.loginSubtitle')}</p>

          <div className="space-y-4">
            <Input
              label={t('auth.loginField')}
              value={form.login}
              onChange={(e) => setForm({ ...form, login: e.target.value })}
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              required
              autoFocus
              error={errors.login}
            />
            <Input
              label={t('auth.password')}
              type={show ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="current-password"
              required
              error={errors.password}
              suffix={
                <button type="button" onClick={() => setShow(!show)} className="p-1 text-slate-500" aria-label={t('auth.password')}>
                  {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              }
            />
            <label className="flex items-center gap-3 text-[15px] font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.remember}
                onChange={(e) => setForm({ ...form, remember: e.target.checked })}
                className="size-5 rounded-md border-slate-300 text-brand-700 accent-brand-700"
              />
              {t('auth.remember')}
            </label>
            {general && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700" role="alert">
                {general}
              </p>
            )}
            <Button type="submit" size="lg" block loading={loading} icon={LogIn} disabled={!form.login || !form.password}>
              {loading ? t('auth.loggingIn') : t('auth.login')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

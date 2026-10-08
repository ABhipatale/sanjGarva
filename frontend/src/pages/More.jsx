import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BarChart3, Boxes, History, LogOut, Package, Receipt, Settings, SlidersHorizontal, Store, Wallet, ArrowRightLeft, PackagePlus } from 'lucide-react'
import LanguageToggle from '../components/LanguageToggle'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../context/ConfirmContext'

const LINKS = [
  { to: '/stock/store', icon: Boxes, key: 'nav.storeStock', tone: 'bg-brand-50 text-brand-700' },
  { to: '/stock/shop', icon: Store, key: 'nav.shopStock', tone: 'bg-sky-50 text-sky-700' },
  { to: '/stock/add', icon: PackagePlus, key: 'quick.addStock', tone: 'bg-emerald-50 text-emerald-700' },
  { to: '/stock/transfer', icon: ArrowRightLeft, key: 'quick.transfer', tone: 'bg-sky-50 text-sky-700' },
  { to: '/sales', icon: Receipt, key: 'nav.salesHistory', tone: 'bg-amber-50 text-amber-700' },
  { to: '/products', icon: Package, key: 'nav.products', tone: 'bg-violet-50 text-violet-700' },
  { to: '/expenses', icon: Wallet, key: 'nav.expenses', tone: 'bg-rose-50 text-rose-700' },
  { to: '/reports', icon: BarChart3, key: 'nav.reports', tone: 'bg-emerald-50 text-emerald-700' },
  { to: '/stock/history', icon: History, key: 'nav.stockHistory', tone: 'bg-slate-100 text-slate-700' },
  { to: '/stock/adjust', icon: SlidersHorizontal, key: 'nav.adjustStock', tone: 'bg-slate-100 text-slate-700' },
  { to: '/settings', icon: Settings, key: 'nav.settings', tone: 'bg-slate-100 text-slate-700' },
]

export default function More() {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const confirm = useConfirm()
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-extrabold text-slate-900">{t('nav.more')}</h1>
        <LanguageToggle />
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {LINKS.map(({ to, icon: Icon, key, tone }) => (
          <Link key={to} to={to} className="flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-2xl bg-white p-3 text-center text-[14px] font-bold leading-tight text-slate-800 shadow-card ring-1 ring-slate-200/60 active:scale-[0.97]">
            <span className={`flex size-12 items-center justify-center rounded-2xl ${tone}`}>
              <Icon className="size-6" aria-hidden />
            </span>
            {t(key)}
          </Link>
        ))}
        <button
          onClick={async () => (await confirm({ title: t('auth.logoutConfirm'), danger: true, confirmText: t('nav.logout') })) && logout()}
          className="flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-2xl bg-white p-3 text-[14px] font-bold text-rose-600 shadow-card ring-1 ring-slate-200/60"
        >
          <span className="flex size-12 items-center justify-center rounded-2xl bg-rose-50">
            <LogOut className="size-6" aria-hidden />
          </span>
          {t('nav.logout')}
        </button>
      </div>
    </div>
  )
}

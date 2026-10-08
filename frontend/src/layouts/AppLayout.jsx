import { Suspense } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import {
  BarChart3, Boxes, Home, LayoutGrid, LogOut, Package, Receipt, Settings, ShoppingCart, Store, Users, Wallet, WifiOff, History,
} from 'lucide-react'
import Logo from '../components/Logo'
import LanguageToggle from '../components/LanguageToggle'
import { PageLoader } from '../components/ui/States'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../context/ConfirmContext'
import { useOnline } from '../hooks/useOnline'
import { useSettings } from '../hooks/queries'
import { localName } from '../utils/format'

const SIDEBAR = [
  { to: '/', icon: Home, key: 'nav.dashboard', end: true },
  { to: '/sales/new', icon: ShoppingCart, key: 'nav.newSale' },
  { to: '/sales', icon: Receipt, key: 'nav.salesHistory', end: true },
  { to: '/stock/store', icon: Boxes, key: 'nav.storeStock' },
  { to: '/stock/shop', icon: Store, key: 'nav.shopStock' },
  { to: '/stock/history', icon: History, key: 'nav.stockHistory' },
  { to: '/products', icon: Package, key: 'nav.products' },
  { to: '/customers', icon: Users, key: 'nav.customersUdhari' },
  { to: '/expenses', icon: Wallet, key: 'nav.expenses' },
  { to: '/reports', icon: BarChart3, key: 'nav.reports' },
  { to: '/settings', icon: Settings, key: 'nav.settings' },
]

const BOTTOM = [
  { to: '/', icon: Home, key: 'nav.home', end: true },
  { to: '/sales/new', icon: ShoppingCart, key: 'nav.sales', primary: true },
  { to: '/stock', icon: Boxes, key: 'nav.stock' },
  { to: '/customers', icon: Users, key: 'nav.customers' },
  { to: '/more', icon: LayoutGrid, key: 'nav.more' },
]

export default function AppLayout() {
  const { t } = useTranslation()
  const { logout, user } = useAuth()
  const confirm = useConfirm()
  const online = useOnline()
  const { data: settings } = useSettings()
  const location = useLocation()
  const barName = localName(settings, 'bar_name') || t('app.name')

  const onLogout = async () => {
    if (await confirm({ title: t('auth.logoutConfirm'), confirmText: t('nav.logout'), danger: true })) logout()
  }

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-linear-to-b from-brand-950 via-brand-900 to-brand-950 text-white lg:flex no-print">
        <div className="flex items-center gap-3 px-5 py-5">
          <Logo className="size-14" />
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold leading-tight">{barName}</p>
            <p className="truncate text-xs text-brand-200">{user?.name}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Main">
          {SIDEBAR.map(({ to, icon: Icon, key, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition',
                  isActive ? 'bg-white text-brand-900 shadow' : 'text-brand-100 hover:bg-white/10 hover:text-white',
                )
              }
            >
              <Icon className="size-5" aria-hidden />
              {t(key)}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t border-white/10 p-3">
          <LanguageToggle dark className="w-full justify-center" />
          <button onClick={onLogout} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-brand-200 hover:bg-white/10 hover:text-white">
            <LogOut className="size-4" aria-hidden />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-brand-900/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] text-white backdrop-blur lg:hidden no-print">
        <Logo className="size-10" />
        <p className="min-w-0 flex-1 truncate text-lg font-extrabold">{barName}</p>
        <LanguageToggle dark />
      </header>

      {!online && (
        <div className="sticky top-0 z-20 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950 no-print" role="status">
          <WifiOff className="size-4" aria-hidden />
          {t('common.offline')}
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-6 lg:pb-10 lg:pt-6">
        <Suspense fallback={<PageLoader />}>
          <Outlet key={location.pathname.split('/')[1]} />
        </Suspense>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-safe backdrop-blur lg:hidden no-print"
        aria-label="Main"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {BOTTOM.map(({ to, icon: Icon, key, end, primary }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx('flex h-16 flex-col items-center justify-center gap-0.5 text-[12px] font-semibold', isActive ? 'text-brand-700' : 'text-slate-500')
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={clsx(
                      'flex items-center justify-center rounded-2xl transition',
                      primary ? 'size-11 -mt-1 bg-linear-to-b from-brand-600 to-brand-800 text-white shadow-lift' : clsx('h-8 w-14', isActive && 'bg-brand-100'),
                    )}
                  >
                    <Icon className="size-[22px]" aria-hidden />
                  </span>
                  {t(key)}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

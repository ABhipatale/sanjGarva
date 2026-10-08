import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Banknote, CheckCircle2, ChevronUp, HandCoins, Receipt, ShoppingCart, Smartphone, Trash2, X } from 'lucide-react'
import clsx from 'clsx'
import SearchInput from '../../components/ui/SearchInput'
import Segmented from '../../components/ui/Segmented'
import Button from '../../components/ui/Button'
import QtyStepper from '../../components/ui/QtyStepper'
import Modal from '../../components/ui/Modal'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'
import CustomerPicker from '../../components/CustomerPicker'
import SaleDetailModal from '../../components/SaleDetailModal'
import { productApi, saleApi } from '../../services/endpoints'
import { useDebounce } from '../../hooks/useDebounce'
import { useCategories, useCustomer, useInvalidateBusiness } from '../../hooks/queries'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import { localName, money, num, toNumber } from '../../utils/format'

const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches

export default function NewSale() {
  const { t } = useTranslation()
  const toast = useToast()
  const confirm = useConfirm()
  const invalidate = useInvalidateBusiness()
  const [params] = useSearchParams()
  const searchRef = useRef(null)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [cart, setCart] = useState([]) // [{ product, qty }]
  const [method, setMethod] = useState('cash')
  const [customer, setCustomer] = useState(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [lastSale, setLastSale] = useState(null)
  const [viewSale, setViewSale] = useState(null)
  const term = useDebounce(search, 200)

  // Preselect a customer for an udhari sale (from customer page).
  const presetCustomer = useCustomer(params.get('customer'))
  useEffect(() => {
    if (presetCustomer.data) {
      setCustomer(presetCustomer.data)
      setMethod('udhari')
    }
  }, [presetCustomer.data])

  const { data: categories = [] } = useCategories()
  const topCategories = categories.filter((c) => !c.parent_id && c.products_count > 0)

  const products = useQuery({
    queryKey: ['products', 'pos', term, category],
    queryFn: ({ signal }) => productApi.list({ search: term, category_id: category, per_page: 100 }, { signal }).then((r) => r.data),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })

  const cartQty = useMemo(() => Object.fromEntries(cart.map((i) => [i.product.id, i.qty])), [cart])
  const total = cart.reduce((s, i) => s + i.qty * toNumber(i.product.selling_price), 0)
  const itemCount = cart.reduce((s, i) => s + i.qty, 0)

  const add = (product) => {
    const inCart = cartQty[product.id] || 0
    if (inCart + 1 > product.shop_qty) {
      toast.error(product.shop_qty <= 0 ? t('sales.outOfStock') : t('sales.only', { qty: product.shop_qty }))
      return
    }
    setCart((c) => (inCart ? c.map((i) => (i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i)) : [...c, { product, qty: 1 }]))
    if (navigator.vibrate) navigator.vibrate(15)
  }

  const setQty = (id, qty) => setCart((c) => (qty <= 0 ? c.filter((i) => i.product.id !== id) : c.map((i) => (i.product.id === id ? { ...i, qty } : i))))

  const clear = async () => {
    if (await confirm({ title: t('sales.clearConfirm'), danger: true, confirmText: t('sales.clear') })) setCart([])
  }

  const mutation = useMutation({
    mutationFn: () =>
      saleApi.create({
        items: cart.map((i) => ({ product_id: i.product.id, quantity: i.qty })),
        payment_method: method,
        customer_id: customer?.id || null,
      }),
    onSuccess: (res) => {
      toast.success(t('sales.success', { amount: money(res.data.total_amount) }))
      setLastSale(res.data)
      setCart([])
      setMethod('cash')
      setCustomer(null)
      setSheetOpen(false)
      invalidate()
      if (isDesktop()) searchRef.current?.focus()
    },
    onError: (err) => {
      toast.error(err.message)
      products.refetch()
    },
  })

  const canComplete = cart.length > 0 && (method !== 'udhari' || customer)
  const complete = () => {
    if (method === 'udhari' && !customer) {
      toast.error(t('sales.customerRequired'))
      return
    }
    mutation.mutate()
  }

  const onSearchKey = (e) => {
    if (e.key === 'Enter' && products.data?.length) {
      const first = products.data.find((p) => p.shop_qty > 0)
      if (first) {
        add(first)
        setSearch('')
      }
    }
  }

  const cartPanel = (
    <CartPanel
      cart={cart}
      total={total}
      itemCount={itemCount}
      method={method}
      setMethod={setMethod}
      customer={customer}
      setCustomer={setCustomer}
      setQty={setQty}
      onClear={clear}
      onComplete={complete}
      canComplete={canComplete}
      loading={mutation.isPending}
    />
  )

  return (
    <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-6">
      <div className="min-w-0">
        <div className="sticky top-[calc(env(safe-area-inset-top)+60px)] z-10 -mx-4 bg-slate-100/95 px-4 pb-3 pt-1 backdrop-blur lg:top-0 lg:mx-0 lg:px-0">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-[22px] font-extrabold text-slate-900">{t('sales.newSale')}</h1>
            {lastSale && (
              <button onClick={() => setViewSale(lastSale.id)} className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-800">
                <CheckCircle2 className="size-4" aria-hidden />
                {lastSale.invoice_no} · {money(lastSale.total_amount)}
              </button>
            )}
          </div>
          <div onKeyDown={onSearchKey}>
            <SearchInput ref={searchRef} value={search} onChange={setSearch} placeholder={t('sales.searchProduct')} autoFocus={isDesktop()} />
          </div>
          {topCategories.length > 0 && (
            <Segmented
              scroll
              size="md"
              className="mt-3"
              value={category}
              onChange={setCategory}
              options={[{ value: '', label: t('common.all') }, ...topCategories.map((c) => ({ value: c.id, label: localName(c) }))]}
            />
          )}
        </div>

        {products.isPending ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : products.isError ? (
          <ErrorState error={products.error} onRetry={products.refetch} />
        ) : products.data.length === 0 ? (
          <EmptyState icon={ShoppingCart} title={search ? t('common.noResults') : t('stock.emptyShop')} message={search ? null : t('stock.emptyShopHint')} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {products.data.map((p) => (
              <ProductTile key={p.id} product={p} inCart={cartQty[p.id] || 0} onAdd={() => add(p)} />
            ))}
          </div>
        )}
      </div>

      {/* Desktop cart */}
      <aside className="hidden lg:block">
        <div className="sticky top-6 flex max-h-[calc(100dvh-48px)] flex-col rounded-3xl bg-white shadow-card ring-1 ring-slate-200/60">{cartPanel}</div>
      </aside>

      {/* Mobile cart bar */}
      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 px-3 pb-2 lg:hidden">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex h-16 w-full items-center gap-3 rounded-2xl bg-linear-to-r from-brand-700 to-brand-900 px-4 text-white shadow-lift animate-slide-up"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-white/15 font-extrabold">{itemCount}</span>
            <span className="flex-1 text-left">
              <span className="block text-xs text-brand-200">{t('sales.cart')}</span>
              <span className="block text-xl font-extrabold tabular-nums">{money(total)}</span>
            </span>
            <span className="flex items-center gap-1 font-bold">
              {t('sales.viewBill')}
              <ChevronUp className="size-5" aria-hidden />
            </span>
          </button>
        </div>
      )}

      <Modal open={sheetOpen} onClose={() => setSheetOpen(false)} title={t('sales.cart')} size="md">
        <div className="-mx-5 -my-4">{cartPanel}</div>
      </Modal>

      <SaleDetailModal saleId={viewSale} onClose={() => setViewSale(null)} />
    </div>
  )
}

function ProductTile({ product: p, inCart, onAdd }) {
  const { t } = useTranslation()
  const out = p.shop_qty <= 0
  const left = p.shop_qty - inCart
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={out}
      className={clsx(
        'relative flex min-h-32 flex-col rounded-2xl p-3.5 text-left shadow-card ring-1 transition active:scale-[0.97]',
        out ? 'bg-slate-50 opacity-60 ring-slate-200' : inCart ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200/70 hover:ring-brand-300',
      )}
      aria-label={`${localName(p)} ${money(p.selling_price)}`}
    >
      {inCart > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex size-7 items-center justify-center rounded-full bg-brand-700 text-sm font-extrabold text-white shadow">
          {inCart}
        </span>
      )}
      <span className="line-clamp-2 text-[16px] font-bold leading-snug text-slate-900">{localName(p)}</span>
      {p.bottle_size && <span className="text-sm text-slate-500">{p.bottle_size}</span>}
      <span className="mt-auto flex items-end justify-between gap-1 pt-2">
        <span className="text-lg font-extrabold tabular-nums text-brand-800">{money(p.selling_price)}</span>
        <span
          className={clsx(
            'rounded-full px-2 py-0.5 text-xs font-bold',
            out ? 'bg-rose-100 text-rose-700' : left <= p.min_stock ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800',
          )}
        >
          {out ? t('stock.out') : num(left)}
        </span>
      </span>
    </button>
  )
}

function CartPanel({ cart, total, itemCount, method, setMethod, customer, setCustomer, setQty, onClear, onComplete, canComplete, loading }) {
  const { t } = useTranslation()
  return (
    <>
      <div className="flex items-center justify-between px-5 pt-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Receipt className="size-5 text-brand-600" aria-hidden />
          {t('sales.cart')}
          {itemCount > 0 && <span className="text-sm font-semibold text-slate-500">· {t('sales.items', { count: itemCount })}</span>}
        </h2>
        {cart.length > 0 && (
          <button onClick={onClear} className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-rose-600 hover:bg-rose-50">
            <Trash2 className="size-4" aria-hidden />
            {t('sales.clear')}
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
        {cart.length === 0 ? (
          <p className="py-10 text-center text-[15px] text-slate-500">{t('sales.emptyCart')}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {cart.map(({ product: p, qty }) => (
              <li key={p.id} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">{localName(p)}</p>
                    <p className="text-sm text-slate-500">
                      {money(p.selling_price)} × {qty}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold tabular-nums">{money(qty * toNumber(p.selling_price))}</span>
                    <button onClick={() => setQty(p.id, 0)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600" aria-label={t('common.delete')}>
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <QtyStepper value={qty} min={0} max={p.shop_qty} onChange={(v) => setQty(p.id, v)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-slate-100 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4">
        <Segmented
          size="lg"
          value={method}
          onChange={setMethod}
          ariaLabel={t('sales.paymentType')}
          options={[
            { value: 'cash', label: t('sales.cash'), icon: Banknote },
            { value: 'udhari', label: t('sales.udhari'), icon: HandCoins },
            { value: 'other', label: t('sales.other'), icon: Smartphone },
          ]}
        />
        {method === 'udhari' && <CustomerPicker value={customer} onChange={setCustomer} />}
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-bold text-slate-700">{t('sales.total')}</span>
          <span className="text-3xl font-extrabold tabular-nums text-slate-900">{money(total)}</span>
        </div>
        <Button size="xl" block variant={method === 'udhari' ? 'gold' : 'success'} onClick={onComplete} disabled={!canComplete} loading={loading} icon={CheckCircle2}>
          {loading ? t('sales.completing') : t('sales.complete')}
        </Button>
      </div>
    </>
  )
}

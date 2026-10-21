import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, ClipboardCheck, Eraser, Moon, Receipt } from 'lucide-react'
import clsx from 'clsx'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Segmented from '../../components/ui/Segmented'
import SearchInput from '../../components/ui/SearchInput'
import { Card } from '../../components/ui/Card'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/ui/States'
import SaleDetailModal from '../../components/SaleDetailModal'
import { productApi, saleApi } from '../../services/endpoints'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import { useCategories, useInvalidateBusiness } from '../../hooks/queries'
import { storage } from '../../utils/storage'
import { localName, money, num } from '../../utils/format'

const LOCATION_KEY = 'closing-location'
const draftKey = (location) => `closing-draft-${location}`

/** Every active product with its Store/Shop quantity (a bar has few enough to load at once). */
async function fetchAllProducts(signal) {
  const all = []
  for (let page = 1; ; page++) {
    const res = await productApi.list({ per_page: 100, page }, { signal })
    all.push(...res.data)
    if (res.meta.current_page >= res.meta.last_page) return all
  }
}

/**
 * Day-end closing: the owner types how many are LEFT of each item; the app works out
 * how many were sold (now − left) and saves them as one bill, removing them from stock.
 */
export default function ClosingStock() {
  const { t } = useTranslation()
  const [location, setLocationState] = useState(() => (storage.get(LOCATION_KEY) === 'store' ? 'store' : 'shop'))
  const [savedSale, setSavedSale] = useState(null)
  const [viewSale, setViewSale] = useState(null)

  const setLocation = (loc) => {
    setLocationState(loc)
    storage.set(LOCATION_KEY, loc)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('closing.title')} subtitle={t('closing.subtitle')} back />

      {savedSale && (
        <Card className="mb-4 flex items-center gap-3 bg-emerald-50 p-4 ring-emerald-200" role="status">
          <CheckCircle2 className="size-8 shrink-0 text-emerald-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-emerald-900">{t('closing.savedTitle')}</p>
            <p className="text-[15px] text-emerald-800">
              {t('closing.soldSummary', { qty: num(savedSale.total_qty), amount: money(savedSale.total_amount) })} · {savedSale.invoice_no}
            </p>
          </div>
          <Button variant="soft" size="sm" icon={Receipt} onClick={() => setViewSale(savedSale.id)}>
            {t('sales.viewBill')}
          </Button>
        </Card>
      )}

      <Segmented
        size="lg"
        value={location}
        onChange={setLocation}
        ariaLabel={t('stock.location')}
        options={[
          { value: 'shop', label: t('stock.shop') },
          { value: 'store', label: t('stock.store') },
        ]}
      />

      <ClosingForm key={location} location={location} onSaved={setSavedSale} />

      <SaleDetailModal saleId={viewSale} onClose={() => setViewSale(null)} />
    </div>
  )
}

function ClosingForm({ location, onSaved }) {
  const { t } = useTranslation()
  const toast = useToast()
  const confirm = useConfirm()
  const invalidate = useInvalidateBusiness()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const { data: categories = [] } = useCategories()
  const [method, setMethod] = useState('cash')
  const [counts, setCounts] = useState(() => {
    try {
      return JSON.parse(storage.get(draftKey(location))) || {}
    } catch {
      return {}
    }
  })
  const inputs = useRef([])
  const qtyKey = `${location}_qty`

  // Keep the half-done count safe if the phone locks or the page reloads.
  useEffect(() => {
    if (Object.keys(counts).length) storage.set(draftKey(location), JSON.stringify(counts))
    else storage.remove(draftKey(location))
  }, [counts, location])

  const query = useQuery({ queryKey: ['stock', 'closing'], queryFn: ({ signal }) => fetchAllProducts(signal) })

  // Only items that have stock here (or were already counted) can have been sold.
  const products = useMemo(
    () => (query.data || []).filter((p) => p[qtyKey] > 0 || counts[p.id] !== undefined),
    [query.data, qtyKey, counts],
  )

  const rows = useMemo(
    () =>
      products.map((p) => {
        const entered = counts[p.id]
        const counted = entered !== undefined && entered !== ''
        const left = counted ? Number(entered) : null
        const now = p[qtyKey]
        const invalid = counted && (!Number.isInteger(left) || left < 0 || left > now)
        const sold = counted && !invalid ? now - left : 0
        return { p, now, counted, left, invalid, sold, amount: sold * Number(p.selling_price) }
      }),
    [products, counts, qtyKey],
  )

  const inCategory = (p, id) => p.category_id === id || p.sub_category_id === id

  // Category chips like New Sale (Beer, Whisky…), only for categories that have stock to count here.
  const categoryOptions = useMemo(() => {
    const options = categories
      .filter((c) => !c.parent_id)
      .map((c) => ({ value: c.id, label: localName(c), count: rows.filter((r) => inCategory(r.p, c.id)).length }))
      .filter((o) => o.count > 0)
    return options.length ? [{ value: '', label: t('common.all'), count: rows.length }, ...options] : []
  }, [categories, rows, t])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter(
      ({ p }) =>
        (!category || inCategory(p, category)) &&
        (!term || [p.name, p.name_mr, p.brand, p.bottle_size].some((v) => v && String(v).toLowerCase().includes(term))),
    )
  }, [rows, search, category])

  const soldRows = rows.filter((r) => r.sold > 0)
  const countedCount = rows.filter((r) => r.counted).length
  const invalidRows = rows.filter((r) => r.invalid)
  const totalQty = soldRows.reduce((s, r) => s + r.sold, 0)
  const totalAmount = soldRows.reduce((s, r) => s + r.amount, 0)

  const setCount = (id, value) => {
    setCounts((c) => {
      const next = { ...c }
      if (value === '') delete next[id]
      else next[id] = value.replace(/\D/g, '')
      return next
    })
  }

  // Enter jumps to the next box, so a whole shelf can be typed without touching the screen.
  const focusNext = (e, index) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const next = inputs.current[index + 1]
    if (next) next.focus()
    else e.currentTarget.blur()
  }

  const mutation = useMutation({
    mutationFn: () =>
      saleApi.closing({
        location,
        payment_method: method,
        counts: rows.filter((r) => r.counted && !r.invalid).map((r) => ({ product_id: r.p.id, remaining: r.left })),
      }),
    onSuccess: (res) => {
      const sale = res.data
      toast.success(t('closing.soldSummary', { qty: num(sale.total_qty), amount: money(sale.total_amount) }))
      setCounts({})
      invalidate()
      onSaved(sale)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    onError: (err) => toast.error(err.message),
  })

  const submit = async () => {
    if (invalidRows.length) {
      const r = invalidRows[0]
      toast.error(t('errors.COUNT_MORE_THAN_STOCK', { product: localName(r.p), available: r.now }))
      inputs.current[visible.indexOf(r)]?.focus()
      return
    }
    if (!soldRows.length) {
      toast.info(countedCount ? t('errors.NOTHING_SOLD') : t('closing.nothingEntered'))
      return
    }
    const uncounted = rows.length - countedCount
    const ok = await confirm({
      title: t('closing.confirmTitle', { qty: num(totalQty), amount: money(totalAmount) }),
      message: uncounted > 0 ? t('closing.confirmUncounted', { count: uncounted }) : null,
      confirmText: t('closing.save'),
      children: (
        <ul className="mt-4 max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-xl text-left ring-1 ring-slate-200">
          {soldRows.map((r) => (
            <li key={r.p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[15px]">
              <span className="min-w-0 truncate font-semibold text-slate-800">{localName(r.p)}</span>
              <span className="shrink-0 tabular-nums text-slate-600">
                {num(r.now)} → {num(r.left)} · <b className="text-rose-600">−{num(r.sold)}</b>
              </span>
            </li>
          ))}
        </ul>
      ),
    })
    if (ok) mutation.mutate()
  }

  const clearAll = async () => {
    if (await confirm({ title: t('closing.clearConfirm'), confirmText: t('closing.clear'), danger: true })) setCounts({})
  }

  if (query.isPending) return <div className="mt-4"><ListSkeleton rows={6} /></div>
  if (query.isError) return <div className="mt-4"><ErrorState error={query.error} onRetry={query.refetch} /></div>

  if (!rows.length) {
    return (
      <div className="mt-4">
        <EmptyState icon={ClipboardCheck} title={t('closing.empty', { location: t(`stock.${location}`) })} />
      </div>
    )
  }

  return (
    <>
      <p className="mt-4 flex gap-2 rounded-2xl bg-brand-50 px-4 py-3 text-[15px] leading-snug text-brand-900">
        <Moon className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
        {t('closing.howTo')}
      </p>

      <div className="mt-4 flex items-center gap-3">
        <SearchInput className="flex-1" value={search} onChange={setSearch} placeholder={t('sales.searchProduct')} />
        {countedCount > 0 && (
          <Button variant="ghost" icon={Eraser} onClick={clearAll} aria-label={t('closing.clear')}>
            <span className="hidden sm:inline">{t('closing.clear')}</span>
          </Button>
        )}
      </div>
      {categoryOptions.length > 0 && (
        <Segmented scroll className="mt-3" value={category} onChange={setCategory} ariaLabel={t('products.category')} options={categoryOptions} />
      )}
      <p className="mt-2 text-sm font-semibold text-slate-500">{t('closing.countedOf', { done: countedCount, total: rows.length })}</p>

      <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-200/70">
        {visible.map((r, index) => (
          <li key={r.p.id} className={clsx('flex items-center gap-3 px-4 py-3', r.invalid ? 'bg-rose-50' : r.sold > 0 && 'bg-emerald-50/50')}>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-slate-900">{localName(r.p)}</p>
              <p className="truncate text-sm text-slate-500">{[r.p.bottle_size, money(r.p.selling_price)].filter(Boolean).join(' · ')}</p>
              <p
                className={clsx(
                  'mt-0.5 text-sm font-bold tabular-nums',
                  r.invalid ? 'text-rose-600' : r.sold > 0 ? 'text-emerald-700' : 'text-slate-400',
                )}
              >
                {r.invalid
                  ? t('closing.tooMany', { qty: num(r.now) })
                  : !r.counted
                    ? t('closing.notCounted')
                    : r.sold > 0
                      ? `${t('closing.sold', { qty: num(r.sold) })} · ${money(r.amount)}`
                      : t('closing.noSale')}
              </p>
            </div>
            <div className="w-14 shrink-0 text-center">
              <p className="text-xs font-semibold uppercase text-slate-500">{t('closing.now')}</p>
              <p className="text-xl font-extrabold tabular-nums text-slate-900">{num(r.now)}</p>
            </div>
            <label className="w-20 shrink-0 text-center">
              <span className="block text-xs font-semibold uppercase text-slate-500">{t('closing.left')}</span>
              <input
                ref={(el) => (inputs.current[index] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                enterKeyHint="next"
                autoComplete="off"
                value={counts[r.p.id] ?? ''}
                onChange={(e) => setCount(r.p.id, e.target.value)}
                onKeyDown={(e) => focusNext(e, index)}
                onFocus={(e) => e.target.select()}
                placeholder="–"
                aria-label={`${localName(r.p)} — ${t('closing.left')}`}
                aria-invalid={r.invalid || undefined}
                className={clsx(
                  'h-12 w-full rounded-xl border-0 text-center text-xl font-extrabold tabular-nums ring-1 ring-inset focus:ring-2 focus:ring-inset',
                  r.invalid ? 'bg-white text-rose-700 ring-rose-400 focus:ring-rose-500' : 'bg-white text-slate-900 ring-slate-300 focus:ring-brand-600',
                )}
              />
            </label>
          </li>
        ))}
        {!visible.length && <li className="px-4 py-6 text-center text-slate-500">{t('common.noResults')}</li>}
      </ul>

      <div className="mt-4">
        <p className="mb-2 text-[15px] font-semibold text-slate-700">{t('closing.paidBy')}</p>
        <Segmented
          value={method}
          onChange={setMethod}
          ariaLabel={t('closing.paidBy')}
          options={[
            { value: 'cash', label: t('sales.cash') },
            { value: 'other', label: t('sales.other') },
          ]}
        />
      </div>

      {/* Room for the fixed total bar */}
      <div className="h-28" aria-hidden />

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 px-3 pb-2 lg:bottom-0 lg:left-64 lg:pb-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl bg-linear-to-r from-brand-700 to-brand-900 p-3 pl-4 text-white shadow-lift">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-brand-200">
              {t('closing.totalSold')} · {t('sales.items', { count: totalQty })}
            </p>
            <p className="text-xl font-extrabold tabular-nums">{money(totalAmount)}</p>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={mutation.isPending}
            className="flex h-12 shrink-0 items-center gap-2 rounded-xl bg-white px-4 text-[16px] font-extrabold text-brand-800 shadow disabled:opacity-60"
          >
            <ClipboardCheck className="size-5" aria-hidden />
            {mutation.isPending ? t('common.saving') : t('closing.save')}
          </button>
        </div>
      </div>
    </>
  )
}

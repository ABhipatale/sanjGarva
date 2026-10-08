import { useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowRightLeft, Boxes, History, IndianRupee, PackagePlus, PackageX, SlidersHorizontal, TriangleAlert } from 'lucide-react'
import Segmented from '../../components/ui/Segmented'
import SearchInput from '../../components/ui/SearchInput'
import Button from '../../components/ui/Button'
import DataTable from '../../components/ui/DataTable'
import Pagination from '../../components/ui/Pagination'
import Modal from '../../components/ui/Modal'
import { StatCard } from '../../components/ui/Card'
import { StockBadge } from '../../components/ui/Badge'
import { EmptyState, QueryState } from '../../components/ui/States'
import MovementList from '../../components/MovementList'
import { stockApi } from '../../services/endpoints'
import { useDebounce } from '../../hooks/useDebounce'
import { localName, money, num } from '../../utils/format'

export default function StockPage() {
  const { location } = useParams()
  const valid = location === 'store' || location === 'shop'
  return valid ? <StockList key={location} location={location} /> : <Navigate to="/stock/shop" replace />
}

function StockList({ location }) {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || ''
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const term = useDebounce(search)

  const query = useQuery({
    queryKey: ['stock', location, term, status, page],
    queryFn: ({ signal }) => stockApi.location(location, { search: term, status, page }, { signal }),
    placeholderData: keepPreviousData,
  })
  const summary = query.data?.meta?.summary

  const setStatus = (s) => {
    setPage(1)
    setParams(s ? { status: s } : {}, { replace: true })
  }

  const isStore = location === 'store'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-extrabold text-slate-900 sm:text-2xl">{isStore ? t('stock.storeStock') : t('stock.shopStock')}</h1>
        <div className="flex gap-2">
          {isStore ? (
            <>
              <Button to="/stock/add" icon={PackagePlus} variant="success">
                {t('stock.addStock')}
              </Button>
              <Button to="/stock/transfer" icon={ArrowRightLeft} variant="soft" className="hidden sm:inline-flex">
                {t('stock.transfer')}
              </Button>
            </>
          ) : (
            <Button to="/stock/transfer" icon={ArrowRightLeft}>
              {t('quick.transfer')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-200/70 p-1" role="tablist">
        {['store', 'shop'].map((loc) => (
          <Link
            key={loc}
            to={`/stock/${loc}`}
            role="tab"
            aria-selected={loc === location}
            className={`flex h-11 items-center justify-center gap-2 rounded-xl text-[15px] font-bold ${loc === location ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-600'}`}
          >
            {loc === 'store' ? <Boxes className="size-5" aria-hidden /> : <ArrowRightLeft className="size-5" aria-hidden />}
            {t(`stock.${loc}Stock`)}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('stock.totalQuantity')} value={summary ? num(summary.total_qty) : '–'} sub={summary && `${num(summary.products)} ${t('stock.totalProducts')}`} icon={Boxes} tone="brand" />
        <StatCard label={t('stock.stockValue')} value={summary ? money(summary.stock_value) : '–'} icon={IndianRupee} tone="green" />
        <StatCard label={t('stock.lowStock')} value={summary ? num(summary.low) : '–'} icon={TriangleAlert} tone="amber" onClick={() => setStatus(status === 'low' ? '' : 'low')} active={status === 'low'} />
        <StatCard label={t('stock.outOfStock')} value={summary ? num(summary.out) : '–'} icon={PackageX} tone="red" onClick={() => setStatus(status === 'out' ? '' : 'out')} active={status === 'out'} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput className="flex-1" value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder={t('sales.searchProduct')} />
        <Segmented
          scroll
          value={status === 'attention' ? 'low' : status}
          onChange={setStatus}
          options={[
            { value: '', label: t('common.all') },
            { value: 'good', label: `🟢 ${t('stock.good')}` },
            { value: 'low', label: `🟠 ${t('stock.low')}` },
            { value: 'out', label: `🔴 ${t('stock.out')}` },
          ]}
        />
      </div>

      <QueryState
        query={query}
        isEmpty={(d) => d.data.length === 0}
        empty={
          <EmptyState
            icon={Boxes}
            title={search || status ? t('common.noResults') : isStore ? t('stock.empty') : t('stock.emptyShop')}
            message={search || status ? null : isStore ? t('stock.emptyHint') : t('stock.emptyShopHint')}
            action={!search && !status && <Button to={isStore ? '/products/new' : '/stock/transfer'} icon={isStore ? PackagePlus : ArrowRightLeft}>{isStore ? t('products.add') : t('quick.transfer')}</Button>}
          />
        }
      >
        {(d) => (
          <>
            <DataTable
              rows={d.data}
              onRowClick={setSelected}
              columns={[
                { key: 'name', header: t('products.name'), render: (p) => <ProductName p={p} /> },
                { key: 'qty', header: t('stock.available'), align: 'right', render: (p) => <span className="text-lg font-extrabold">{num(p[`${location}_qty`])}</span> },
                { key: 'cost', header: t('products.costPrice'), align: 'right', render: (p) => money(p.avg_cost) },
                ...(isStore ? [] : [{ key: 'sell', header: t('products.sellingPrice'), align: 'right', render: (p) => money(p.selling_price) }]),
                { key: 'value', header: t('stock.stockValue'), align: 'right', render: (p) => money(p[`${location}_value`]) },
                { key: 'status', header: t('common.status'), render: (p) => <StockBadge status={p[`${location}_status`]} /> },
              ]}
              renderCard={(p) => (
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <ProductName p={p} />
                    <p className="mt-1 text-sm text-slate-500">
                      {t('stock.stockValue')}: {money(p[`${location}_value`])}
                      {!isStore && ` · ${money(p.selling_price)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold tabular-nums text-slate-900">{num(p[`${location}_qty`])}</p>
                    <StockBadge status={p[`${location}_status`]} />
                  </div>
                </div>
              )}
            />
            <Pagination meta={d.meta} onChange={setPage} />
          </>
        )}
      </QueryState>

      <div className="flex justify-center gap-2 pt-2">
        <Button to="/stock/history" variant="ghost" icon={History}>{t('stock.history')}</Button>
        <Button to="/stock/adjust" variant="ghost" icon={SlidersHorizontal}>{t('stock.adjust')}</Button>
      </div>

      <ProductStockSheet product={selected} location={location} onClose={() => setSelected(null)} />
    </div>
  )
}

function ProductName({ p }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-bold text-slate-900">{localName(p)}</p>
      <p className="truncate text-sm text-slate-500">{[p.bottle_size, localName(p.category)].filter(Boolean).join(' · ')}</p>
    </div>
  )
}

function ProductStockSheet({ product, location, onClose }) {
  const { t } = useTranslation()
  if (!product) return null
  return (
    <Modal open={!!product} onClose={onClose} title={localName(product)} size="lg">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-50 p-4 text-center">
          <p className="text-sm font-semibold text-slate-500">{t('stock.storeStock')}</p>
          <p className="text-3xl font-extrabold tabular-nums">{num(product.store_qty)}</p>
          <StockBadge status={product.store_status} />
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 text-center">
          <p className="text-sm font-semibold text-slate-500">{t('stock.shopStock')}</p>
          <p className="text-3xl font-extrabold tabular-nums">{num(product.shop_qty)}</p>
          <StockBadge status={product.shop_status} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button to={`/stock/add?product=${product.id}`} variant="soft" size="sm" icon={PackagePlus}>{t('stock.addStock')}</Button>
        <Button to={`/stock/transfer?product=${product.id}`} variant="soft" size="sm" icon={ArrowRightLeft}>{t('stock.transfer')}</Button>
        <Button to={`/stock/adjust?product=${product.id}&location=${location}`} variant="soft" size="sm" icon={SlidersHorizontal}>{t('stock.adjust')}</Button>
      </div>
      <h3 className="mb-2 mt-5 text-[16px] font-bold text-slate-900">{t('stock.history')}</h3>
      <MovementList productId={product.id} compact />
    </Modal>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Package, Plus, Tags } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import SearchInput from '../../components/ui/SearchInput'
import Segmented from '../../components/ui/Segmented'
import Button from '../../components/ui/Button'
import DataTable from '../../components/ui/DataTable'
import Pagination from '../../components/ui/Pagination'
import { Badge, StockBadge } from '../../components/ui/Badge'
import { EmptyState, QueryState } from '../../components/ui/States'
import CategoryManager from './CategoryManager'
import { productApi } from '../../services/endpoints'
import { useCategories } from '../../hooks/queries'
import { useDebounce } from '../../hooks/useDebounce'
import { localName, money, num } from '../../utils/format'

export default function Products() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('active')
  const [page, setPage] = useState(1)
  const [managing, setManaging] = useState(false)
  const term = useDebounce(search)
  const { data: categories = [] } = useCategories()

  const query = useQuery({
    queryKey: ['products', 'list', term, category, status, page],
    queryFn: ({ signal }) => productApi.list({ search: term, category_id: category, status, page }, { signal }),
    placeholderData: keepPreviousData,
  })

  const reset = (fn) => (v) => {
    fn(v)
    setPage(1)
  }
  const unit = (p) => t(`products.units.${p.unit}`)

  return (
    <div className="space-y-3">
      <PageHeader
        title={t('products.title')}
        actions={
          <>
            <Button variant="secondary" icon={Tags} onClick={() => setManaging(true)} aria-label={t('products.manageCategories')}>
              <span className="hidden sm:inline">{t('products.categories')}</span>
            </Button>
            <Button to="/products/new" icon={Plus}>
              <span className="hidden sm:inline">{t('products.add')}</span>
            </Button>
          </>
        }
      />
      <SearchInput value={search} onChange={reset(setSearch)} placeholder={t('sales.searchProduct')} />
      <Segmented
        scroll
        value={category}
        onChange={reset(setCategory)}
        options={[{ value: '', label: t('common.all') }, ...categories.filter((c) => !c.parent_id).map((c) => ({ value: c.id, label: localName(c), count: c.products_count || undefined }))]}
      />
      <Segmented
        value={status}
        onChange={reset(setStatus)}
        options={[
          { value: 'active', label: t('common.active') },
          { value: 'inactive', label: t('common.inactive') },
          { value: 'all', label: t('common.all') },
        ]}
      />

      <QueryState
        query={query}
        isEmpty={(d) => d.data.length === 0}
        empty={<EmptyState icon={Package} title={search || category ? t('common.noResults') : t('products.empty')} action={!search && <Button to="/products/new" icon={Plus}>{t('products.addFirst')}</Button>} />}
      >
        {(d) => (
          <>
            <DataTable
              rows={d.data}
              onRowClick={(p) => navigate(`/products/${p.id}/edit`)}
              columns={[
                {
                  key: 'name',
                  header: t('products.name'),
                  render: (p) => (
                    <div>
                      <p className="font-bold">{localName(p)} {!p.is_active && <Badge tone="gray">{t('common.inactive')}</Badge>}</p>
                      <p className="text-sm text-slate-500">{[p.brand, p.bottle_size, unit(p)].filter(Boolean).join(' · ')}</p>
                    </div>
                  ),
                },
                { key: 'category', header: t('products.category'), render: (p) => localName(p.category) || '–' },
                { key: 'cost', header: t('products.costPrice'), align: 'right', render: (p) => money(p.cost_price) },
                { key: 'sell', header: t('products.sellingPrice'), align: 'right', render: (p) => <span className="font-bold">{money(p.selling_price)}</span> },
                { key: 'profit', header: t('products.profitPerUnit'), align: 'right', render: (p) => <span className="text-emerald-700">{money(p.profit_per_unit)}</span> },
                { key: 'store', header: t('stock.store'), align: 'right', render: (p) => num(p.store_qty) },
                { key: 'shop', header: t('stock.shop'), align: 'right', render: (p) => <span className="inline-flex items-center gap-2">{num(p.shop_qty)} <StockBadge status={p.shop_status} /></span> },
              ]}
              renderCard={(p) => (
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900">{localName(p)}</p>
                      <p className="truncate text-sm text-slate-500">{[p.brand, p.bottle_size, localName(p.category)].filter(Boolean).join(' · ')}</p>
                    </div>
                    {p.is_active ? <StockBadge status={p.shop_status} /> : <Badge>{t('common.inactive')}</Badge>}
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
                    <div className="rounded-xl bg-slate-50 py-1.5">
                      <p className="text-xs text-slate-500">{t('products.costPrice')}</p>
                      <p className="font-bold tabular-nums">{money(p.cost_price)}</p>
                    </div>
                    <div className="rounded-xl bg-brand-50 py-1.5">
                      <p className="text-xs text-slate-500">{t('products.sellingPrice')}</p>
                      <p className="font-bold tabular-nums text-brand-800">{money(p.selling_price)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 py-1.5">
                      <p className="text-xs text-slate-500">{t('stock.store')}</p>
                      <p className="font-bold tabular-nums">{num(p.store_qty)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 py-1.5">
                      <p className="text-xs text-slate-500">{t('stock.shop')}</p>
                      <p className="font-bold tabular-nums">{num(p.shop_qty)}</p>
                    </div>
                  </div>
                </div>
              )}
            />
            <Pagination meta={d.meta} onChange={setPage} />
          </>
        )}
      </QueryState>

      <CategoryManager open={managing} onClose={() => setManaging(false)} />
    </div>
  )
}

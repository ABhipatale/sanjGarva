import { useQuery, useQueryClient } from '@tanstack/react-query'
import { categoryApi, customerApi, expenseApi, settingsApi } from '../services/endpoints'
import { tokenStore } from '../services/api'

// Shared, cached reference data.
export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: () => categoryApi.list().then((r) => r.data), staleTime: 5 * 60_000 })
}

export function useExpenseCategories() {
  return useQuery({ queryKey: ['expense-categories'], queryFn: () => expenseApi.categories().then((r) => r.data), staleTime: 5 * 60_000 })
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then((r) => r.data),
    staleTime: 10 * 60_000,
    enabled: !!tokenStore.get(),
  })
}

export function useCustomer(id) {
  return useQuery({ queryKey: ['customer', String(id)], queryFn: () => customerApi.get(id).then((r) => r.data), enabled: !!id })
}

/** Invalidate everything affected by a stock / money change. */
export function useInvalidateBusiness() {
  const qc = useQueryClient()
  return (...extra) => {
    ;['dashboard', 'stock', 'products', 'sales', 'movements', 'reports', 'customers', 'customer', 'ledger', 'expenses', 'purchases', ...extra].forEach(
      (key) => qc.invalidateQueries({ queryKey: [key] }),
    )
  }
}

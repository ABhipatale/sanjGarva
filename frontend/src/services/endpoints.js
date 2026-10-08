import { api } from './api'

// Thin, typed-by-convention wrappers around the REST API. Each returns the JSON envelope.
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  changePassword: (data) => api.put('/auth/password', data),
}

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  uploadLogo: (file) => {
    const fd = new FormData()
    fd.append('logo', file)
    return api.post('/settings/logo', fd)
  },
  removeLogo: () => api.delete('/settings/logo'),
}

export const dashboardApi = { get: () => api.get('/dashboard') }

export const categoryApi = {
  list: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  remove: (id) => api.delete(`/categories/${id}`),
}

export const productApi = {
  list: (params, opts) => api.get('/products', params, opts),
  get: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  remove: (id) => api.delete(`/products/${id}`),
}

export const stockApi = {
  location: (location, params, opts) => api.get(location === 'store' ? '/store-stock' : '/shop-stock', params, opts),
  add: (data) => api.post('/store-stock/add', data),
  purchases: (params) => api.get('/purchases', params),
  transfer: (data) => api.post('/stock/transfer', data),
  adjust: (data) => api.post('/stock/adjust', data),
  adjustments: (params) => api.get('/stock/adjustments', params),
  movements: (params) => api.get('/stock/movements', params),
}

export const saleApi = {
  list: (params) => api.get('/sales', params),
  get: (id) => api.get(`/sales/${id}`),
  create: (data) => api.post('/sales', data),
  void: (id, reason) => api.post(`/sales/${id}/void`, { reason }),
}

export const customerApi = {
  list: (params, opts) => api.get('/customers', params, opts),
  get: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  remove: (id) => api.delete(`/customers/${id}`),
  ledger: (id, params) => api.get(`/customers/${id}/ledger`, params),
  payment: (id, data) => api.post(`/customers/${id}/payment`, data),
}

export const expenseApi = {
  categories: () => api.get('/expense-categories'),
  createCategory: (data) => api.post('/expense-categories', data),
  list: (params) => api.get('/expenses', params),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  remove: (id) => api.delete(`/expenses/${id}`),
}

export const reportApi = {
  sales: (params) => api.get('/reports/sales', params),
  stock: () => api.get('/reports/stock'),
  profitLoss: (params) => api.get('/reports/profit-loss', params),
  udhari: (params) => api.get('/reports/udhari', params),
  expenses: (params) => api.get('/reports/expenses', params),
  export: (type, params) => api.download(`/export/${type}`, params, `saanj-garva-${type}.csv`),
}

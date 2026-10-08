import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import { PageLoader } from './components/ui/States'
import { useAuth } from './context/AuthContext'
import { useSettings } from './hooks/queries'
import { setCurrencySymbol } from './utils/format'

// Route-level code splitting.
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const NewSale = lazy(() => import('./pages/sales/NewSale'))
const SalesHistory = lazy(() => import('./pages/sales/SalesHistory'))
const StockPage = lazy(() => import('./pages/stock/StockPage'))
const AddStock = lazy(() => import('./pages/stock/AddStock'))
const TransferStock = lazy(() => import('./pages/stock/TransferStock'))
const AdjustStock = lazy(() => import('./pages/stock/AdjustStock'))
const StockHistory = lazy(() => import('./pages/stock/StockHistory'))
const Products = lazy(() => import('./pages/products/Products'))
const ProductForm = lazy(() => import('./pages/products/ProductForm'))
const Customers = lazy(() => import('./pages/customers/Customers'))
const CustomerDetail = lazy(() => import('./pages/customers/CustomerDetail'))
const Expenses = lazy(() => import('./pages/Expenses'))
const Reports = lazy(() => import('./pages/reports/Reports'))
const Settings = lazy(() => import('./pages/Settings'))
const More = lazy(() => import('./pages/More'))
const NotFound = lazy(() => import('./pages/NotFound'))

function RequireAuth({ children }) {
  const { user, checking } = useAuth()
  const location = useLocation()
  if (checking) return <PageLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}

function CurrencySync() {
  const { data } = useSettings()
  useEffect(() => setCurrencySymbol(data?.currency), [data?.currency])
  return null
}

export default function App() {
  const { user } = useAuth()

  return (
    <Suspense fallback={<PageLoader />}>
      {user && <CurrencySync />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="sales/new" element={<NewSale />} />
          <Route path="sales" element={<SalesHistory />} />
          <Route path="stock" element={<Navigate to="/stock/shop" replace />} />
          <Route path="stock/add" element={<AddStock />} />
          <Route path="stock/transfer" element={<TransferStock />} />
          <Route path="stock/adjust" element={<AdjustStock />} />
          <Route path="stock/history" element={<StockHistory />} />
          <Route path="stock/:location" element={<StockPage />} />
          <Route path="products" element={<Products />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id/edit" element={<ProductForm />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="more" element={<More />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

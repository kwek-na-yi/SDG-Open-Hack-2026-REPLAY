import { lazy, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { PageLoading } from './components/common/ui'
import Layout from './components/layout/Layout'
import Buy from './pages/Buy'
import Discover from './pages/Discover'
import Landing from './pages/Landing'
import { useStore } from './store/store'

// Public entry pages load with the app; the rest are split into their own chunks.
const Account = lazy(() => import('./pages/Account'))
const Bag = lazy(() => import('./pages/Bag'))
const ConsumerDashboard = lazy(() => import('./pages/ConsumerDashboard'))
const Passport = lazy(() => import('./pages/Passport'))
const PassportIndex = lazy(() => import('./pages/Passport').then((m) => ({ default: m.PassportIndex })))
const Plus = lazy(() => import('./pages/Plus'))
const Sell = lazy(() => import('./pages/Sell'))
const Transform = lazy(() => import('./pages/Transform'))
const WalletPage = lazy(() => import('./pages/Wallet'))

/** Personalised pages need an account — send signed-out visitors to sign in, then straight back. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useStore()
  const loc = useLocation()
  if (!ready) return <PageLoading label="Loading your account…" />
  if (!user) return <Navigate to={`/account?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  return <>{children}</>
}

const auth = (el: ReactNode) => <RequireAuth>{el}</RequireAuth>

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="discover" element={<Discover />} />
        <Route path="buy/:id" element={<Buy />} />
        <Route path="plus" element={<Plus />} />
        <Route path="account" element={<Account />} />

        <Route path="dashboard" element={auth(<ConsumerDashboard />)} />
        <Route path="me" element={auth(<ConsumerDashboard />)} />
        <Route path="bag" element={auth(<Bag />)} />
        <Route path="sell" element={auth(<Sell />)} />
        <Route path="transform/:itemId" element={auth(<Transform />)} />
        <Route path="passport" element={auth(<PassportIndex />)} />
        <Route path="passport/:id" element={auth(<Passport />)} />
        <Route path="wallet" element={auth(<WalletPage />)} />

        {/* Routes from features removed after the hackathon — keep old links working. */}
        <Route path="brand" element={<Navigate to="/dashboard" replace />} />
        <Route path="business" element={<Navigate to="/discover" replace />} />
        <Route path="marketplace" element={<Navigate to="/discover" replace />} />
        <Route path="challenges" element={<Navigate to="/discover" replace />} />
        <Route path="drops/*" element={<Navigate to="/discover" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

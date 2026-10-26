import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import ConsumerDashboard from './pages/ConsumerDashboard'
import Buy from './pages/Buy'
import Bag from './pages/Bag'
import Discover from './pages/Discover'
import Transform from './pages/Transform'
import Passport, { PassportIndex } from './pages/Passport'
import WalletPage from './pages/Wallet'
import Account from './pages/Account'
import Sell from './pages/Sell'
import Plus from './pages/Plus'
import { useStore } from './lib/store'
import { LoadingAccount } from './pages/Account'

/** Personalised pages need an account — send signed-out visitors to sign in, then straight back. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useStore()
  const loc = useLocation()
  if (!ready) return <LoadingAccount />
  if (!user) return <Navigate to={`/account?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  return <>{children}</>
}

const auth = (el: ReactNode) => <RequireAuth>{el}</RequireAuth>

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="account" element={<Account />} />
        <Route path="sell" element={auth(<Sell />)} />
        <Route path="dashboard" element={auth(<ConsumerDashboard />)} />
        <Route path="me" element={auth(<ConsumerDashboard />)} />
        <Route path="brand" element={<Navigate to="/dashboard" replace />} />
        <Route path="buy/:id" element={<Buy />} />
        <Route path="bag" element={auth(<Bag />)} />
        <Route path="drops/*" element={<Navigate to="/discover" replace />} />
        <Route path="business" element={<Navigate to="/discover" replace />} />
        <Route path="discover" element={<Discover />} />
        <Route path="marketplace" element={<Navigate to="/discover" replace />} />
        <Route path="transform/:itemId" element={auth(<Transform />)} />
        <Route path="passport" element={auth(<PassportIndex />)} />
        <Route path="passport/:id" element={auth(<Passport />)} />
        <Route path="wallet" element={auth(<WalletPage />)} />
        <Route path="challenges" element={<Navigate to="/discover" replace />} />
        <Route path="plus" element={<Plus />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bookmark, Compass, Fingerprint, Home, LayoutGrid, LogOut, Menu, Plus, RotateCcw, Ruler, ShoppingBag, Sparkles, Tag, User, Wallet } from 'lucide-react'
import { initials } from '../lib/account'
import { useStore } from '../lib/store'
import FitReminder from './FitReminder'
import { CountUp, Toasts, sgd } from './ui'

export function Logo({ light }: { light?: boolean }) {
  return (
    <span className="logo" style={light ? { color: '#fff' } : undefined}>
      <svg className="logo-mark" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="8" fill={light ? '#fff' : '#2f1b52'} />
        <path d="M16 7a9 9 0 1 1-8.5 6" fill="none" stroke={light ? '#7A52B3' : '#D9C6F7'} strokeWidth="3" strokeLinecap="round" />
        <path d="M5 9l2.6 4.4L12 11" fill="none" stroke={light ? '#7A52B3' : '#D9C6F7'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>
        RE<span className="colon">:</span>PLAY
      </span>
    </span>
  )
}

/** Phone-only bottom tab bar — the main destinations within thumb reach. */
function TabBar() {
  const { state, user } = useStore()
  const loc = useLocation()
  const on = (paths: string[]) => paths.some((p) => (p === '/' ? loc.pathname === '/' : loc.pathname.startsWith(p)))
  const tab = (to: string, label: string, icon: ReactNode, paths: string[], extra?: ReactNode) => (
    <Link to={to} className={`tabbar-item ${on(paths) ? 'on' : ''}`} aria-current={on(paths) ? 'page' : undefined}>
      <span className="tabbar-ic">
        {icon}
        {extra}
      </span>
      <span>{label}</span>
    </Link>
  )
  return (
    <nav className="tabbar" aria-label="Main">
      {tab('/', 'Home', <Home size={20} />, ['/'])}
      {tab('/discover', 'Discover', <Compass size={20} />, ['/discover', '/buy'])}
      <Link to="/sell" className={`tabbar-item tabbar-sell ${on(['/sell']) ? 'on' : ''}`} aria-label="Sell an Item">
        <span className="tabbar-ic">
          <Plus size={22} />
        </span>
        <span>Sell</span>
      </Link>
      {tab('/bag', 'Bag', <ShoppingBag size={20} />, ['/bag'], state.cart.length > 0 ? <span className="count-pill">{state.cart.length}</span> : null)}
      {user
        ? tab('/dashboard', 'Me', <LayoutGrid size={20} />, ['/dashboard', '/me', '/passport', '/transform', '/wallet', '/account'])
        : tab('/account', 'Sign in', <User size={20} />, ['/account'])}
    </nav>
  )
}

function ProfileMenu() {
  const { resetDemo, balance, user, ready, signOut, state } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const nav = useNavigate()
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  if (!ready) return <span className="avatar" aria-hidden style={{ opacity: 0.15 }} />
  if (!user) {
    return (
      <Link to="/account" className="btn btn-outline btn-sm nav-signin">
        <User size={14} /> Sign in
      </Link>
    )
  }
  const go = (to: string) => {
    setOpen(false)
    nav(to)
  }
  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="avatar" onClick={() => setOpen((o) => !o)} aria-label="Account">
        {initials(user.name)}
      </button>
      {open && (
        <div className="menu fade-in">
          <div className="menu-head">
            <div className="strong">{user.name}</div>
            <div className="small muted email">{user.email}</div>
            <div className="small mt8">RE:PLAY Cash: <b>{sgd(balance, 2)}</b></div>
          </div>
          <button className="menu-item" onClick={() => go('/account')}>
            <User size={15} /> Account
          </button>
          <button className="menu-item" onClick={() => go('/account?tab=measurements')}>
            <Ruler size={15} /> Body Measurements
          </button>
          <button className="menu-item" onClick={() => go('/account?tab=listings')}>
            <Tag size={15} /> My Listings
          </button>
          <button className="menu-item" onClick={() => go('/account?tab=designs')}>
            <Bookmark size={15} /> Saved Designs
          </button>
          <button className="menu-item" onClick={() => go('/plus')}>
            <Sparkles size={15} /> RE:PLAY+ {state.plus ? <span className="badge badge-gold" style={{ marginLeft: 'auto' }}>On</span> : <span className="tiny muted" style={{ marginLeft: 'auto' }}>Try demo</span>}
          </button>
          <button className="menu-item" onClick={() => go('/passport')}>
            <Fingerprint size={15} /> Life Passports
          </button>
          <button className="menu-item" onClick={() => go('/wallet')}>
            <Wallet size={15} /> Circular Wallet
          </button>
          <div className="divider" style={{ margin: '4px 0' }} />
          <button className="menu-item" onClick={() => { setOpen(false); resetDemo(); nav('/') }}>
            <RotateCcw size={15} /> Reset demo data
          </button>
          <button className="menu-item" style={{ color: 'var(--danger)' }} onClick={async () => { setOpen(false); await signOut(); nav('/') }}>
            <LogOut size={15} /> Log Out
          </button>
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const { balance, state, user } = useStore()
  const loc = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [bump, setBump] = useState(false)
  const prevBal = useRef(balance)

  useEffect(() => {
    window.scrollTo(0, 0)
    setMenuOpen(false)
  }, [loc.pathname])

  useEffect(() => {
    if (prevBal.current !== balance) {
      setBump(true)
      const t = setTimeout(() => setBump(false), 700)
      prevBal.current = balance
      return () => clearTimeout(t)
    }
  }, [balance])

  const link = (to: string, label: string, extraActive?: string[]) => (
    <NavLink to={to} className={({ isActive }) => `nav-link ${isActive || extraActive?.some((p) => loc.pathname.startsWith(p)) ? 'active' : ''}`}>
      {label}
    </NavLink>
  )

  return (
    <>
      <div className="demo-banner">
        <b>●</b> PROTOTYPE<span className="demo-long"> — all values, balances and AI outputs are simulated.</span> No real money moves.
      </div>
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/">
            <Logo />
          </Link>
          <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
            {link('/discover', 'Discover', ['/buy'])}
            {link('/dashboard', 'Dashboard', ['/passport', '/transform'])}
          </nav>
          <div className="nav-right">
            <Link to="/sell" className="btn btn-accent btn-sm nav-sell" title="Sell an Item" aria-label="Sell an Item">
              <Plus size={14} /> <span className="nav-sell-lbl">Sell an Item</span>
            </Link>
            <Link to="/bag" className="icon-btn nav-bag" aria-label={`Bag, ${state.cart.length} item${state.cart.length === 1 ? '' : 's'}`} title="Your bag">
              <ShoppingBag size={15} />
              {state.cart.length > 0 && <span className="count-pill">{state.cart.length}</span>}
            </Link>
            {user && (
              <Link to="/wallet" className={`wallet-pill ${bump ? 'bump' : ''}`} title="RE:PLAY Wallet (simulated)">
                <span className="ic">
                  <Wallet size={12} />
                </span>
                <span className="lbl">
                  <CountUp value={balance} format={(n) => sgd(Math.round(n * 100) / 100, 2)} duration={700} />
                </span>
              </Link>
            )}
            <ProfileMenu />
            <button className="icon-btn mobile-nav-toggle" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
              <Menu size={16} />
            </button>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container row between wrap">
          <span>
            <b style={{ color: 'var(--ink)' }}>RE:PLAY</b> — Circular Commerce / AI Value Recovery. Hackathon prototype, Singapore 2026.
          </span>
          <span className="mono tiny">We don’t ask people to consume less. We make it more profitable to circulate what already exists.</span>
        </div>
      </footer>
      <TabBar />
      <FitReminder />
      <Toasts />
    </>
  )
}

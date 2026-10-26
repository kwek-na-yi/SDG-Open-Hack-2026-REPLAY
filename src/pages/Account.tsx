import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Bookmark, Eye, History, LogOut, Pencil, Plus, RotateCcw, Ruler, ShoppingBag, Tag, Trash2, User } from 'lucide-react'
import { HistorySection, SavedDesignsSection } from '../components/Designs'
import FitFields, { FitSummary, type FitErrors } from '../components/FitFields'
import { ItemVisual, PageHead, ProductImage, sgd } from '../components/ui'
import { EMAIL_RE, MIN_PASSWORD, firstName, initials, type Listing } from '../lib/account'
import { draftOf, validateFit, type FitDraft } from '../lib/fit'
import { useStore } from '../lib/store'

/* ------------------------------------------------------------------ */
/* Signed out: sign in / create account                                */
/* ------------------------------------------------------------------ */

type AuthErrors = Partial<Record<'name' | 'email' | 'password' | 'confirm' | 'form', string>>

/** `onSignedIn(dest)` — where to go once the account has loaded. */
function AuthPanel({ onSignedIn }: { onSignedIn: (dest: string) => void }) {
  const { signIn, signUp, configured } = useStore()
  const [params, setParams] = useSearchParams()
  const mode = params.get('mode') === 'signup' ? 'signup' : 'signin'
  const next = params.get('next')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<AuthErrors>({})
  const [busy, setBusy] = useState(false)
  /** Email awaiting confirmation (only if the Supabase project requires it) */
  const [sentTo, setSentTo] = useState<string | null>(null)

  const switchMode = (m: 'signin' | 'signup') => {
    const p = new URLSearchParams(params)
    m === 'signup' ? p.set('mode', 'signup') : p.delete('mode')
    setParams(p, { replace: true })
    setErrors({})
    setPassword('')
    setConfirm('')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: AuthErrors = {}
    if (mode === 'signup' && !name.trim()) errs.name = 'Please enter your name.'
    if (!EMAIL_RE.test(email.trim())) errs.email = 'Please enter a valid email address.'
    if (!password) errs.password = 'Please enter your password.'
    else if (mode === 'signup' && password.length < MIN_PASSWORD) errs.password = `Use at least ${MIN_PASSWORD} characters.`
    if (mode === 'signup' && confirm !== password) errs.confirm = 'Passwords don’t match.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    const res = mode === 'signup' ? await signUp(name, email, password) : await signIn(email, password)
    setBusy(false)
    if (res && typeof res === 'object') {
      setSentTo(email.trim())
      return
    }
    if (res) {
      setErrors({ form: res })
      setPassword('')
      setConfirm('')
      return
    }
    onSignedIn(next && next.startsWith('/') ? next : mode === 'signup' ? '/discover' : '/account')
  }

  const field = (id: keyof AuthErrors, label: string, input: JSX.Element) => (
    <div className={`field ${errors[id] ? 'has-error' : ''}`}>
      <label htmlFor={`auth-${id}`}>{label}</label>
      {input}
      {errors[id] && (
        <span id={`auth-${id}-err`} className="field-error">
          {errors[id]}
        </span>
      )}
    </div>
  )
  const clear = (k: keyof AuthErrors) => errors[k] && setErrors((x) => ({ ...x, [k]: undefined, form: undefined }))

  return (
    <div className="container page">
      <div className="auth-wrap">
        <div className="card card-pad auth-card fade-in">
          <div className="eyebrow">
            <span className="dot" /> RE:PLAY account
          </div>
          <h1 className="title mt8">{mode === 'signup' ? 'Create account' : 'Sign In'}</h1>
          <p className="small muted mt8">{next ? 'Sign in to continue — your bag, listings and fit profile are saved to your account.' : mode === 'signup' ? 'Buy, sell and transform pre-loved clothing.' : 'Welcome back to RE:PLAY.'}</p>

          {!configured && (
            <div className="auth-alert mt16" role="alert">
              Accounts aren’t connected yet — this build is missing its Supabase keys.
            </div>
          )}
          {sentTo ? (
            <div className="stack gap12 mt16">
              <div className="auth-note">
                We’ve sent a confirmation link to <b>{sentTo}</b>. Open it on any device, then come back here and sign in.
              </div>
              <button className="btn btn-primary btn-lg btn-block" onClick={() => (setSentTo(null), switchMode('signin'))}>
                Back to Sign In
              </button>
            </div>
          ) : (
          <form className="stack gap12 mt16" noValidate onSubmit={submit}>
            {errors.form && (
              <div className="auth-alert" role="alert">
                {errors.form}
              </div>
            )}
            {mode === 'signup' &&
              field('name', 'Name', <input id="auth-name" className="input" autoComplete="name" value={name} aria-invalid={!!errors.name} onChange={(e) => (setName(e.target.value), clear('name'))} />)}
            {field('email', 'Email', <input id="auth-email" className="input" type="email" autoComplete="email" value={email} aria-invalid={!!errors.email} onChange={(e) => (setEmail(e.target.value), clear('email'))} />)}
            {field(
              'password',
              'Password',
              <input id="auth-password" className="input" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} aria-invalid={!!errors.password} placeholder={mode === 'signup' ? `At least ${MIN_PASSWORD} characters` : ''} onChange={(e) => (setPassword(e.target.value), clear('password'))} />,
            )}
            {mode === 'signup' &&
              field('confirm', 'Confirm password', <input id="auth-confirm" className="input" type="password" autoComplete="new-password" value={confirm} aria-invalid={!!errors.confirm} onChange={(e) => (setConfirm(e.target.value), clear('confirm'))} />)}
            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign In'}
            </button>
          </form>
          )}

          <div className="small muted mt16" style={{ textAlign: 'center' }}>
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button className="link-btn" style={{ fontSize: 13 }} onClick={() => switchMode('signin')}>
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don’t have an account?{' '}
                <button className="link-btn" style={{ fontSize: 13 }} onClick={() => switchMode('signup')}>
                  Create account
                </button>
              </>
            )}
          </div>
          <p className="tiny muted mt16" style={{ textAlign: 'center' }}>
            Your account works on any device — sign in with the same email and password.
          </p>
        </div>
      </div>
    </div>
  )
}

export function LoadingAccount() {
  return (
    <div className="container page empty" aria-busy="true">
      Loading your account…
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Signed in: account sections                                         */
/* ------------------------------------------------------------------ */

type Tab = 'profile' | 'measurements' | 'listings' | 'purchases' | 'designs' | 'history'
const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: 'profile', label: 'Profile', icon: <User size={14} /> },
  { id: 'measurements', label: 'Body Measurements', icon: <Ruler size={14} /> },
  { id: 'listings', label: 'My Listings', icon: <Tag size={14} /> },
  { id: 'purchases', label: 'My Purchases', icon: <ShoppingBag size={14} /> },
  { id: 'designs', label: 'Saved Designs', icon: <Bookmark size={14} /> },
  { id: 'history', label: 'Transformation History', icon: <History size={14} /> },
]

function ProfileSection() {
  const { user, balance, state, updateName, setFitReminderOff } = useStore()
  const [name, setName] = useState(user!.name)
  return (
    <div className="grid g2 stack-md" style={{ alignItems: 'start' }}>
      <form
        className="card card-pad stack gap12"
        onSubmit={(e) => {
          e.preventDefault()
          updateName(name)
        }}
      >
        <div className="card-title">Profile</div>
        <div className="field">
          <label htmlFor="acc-name">Name</label>
          <input id="acc-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="acc-email">Email</label>
          <input id="acc-email" className="input" value={user!.email} readOnly disabled />
        </div>
        <div className="small muted">Member since {new Date(user!.createdAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={!name.trim() || name.trim() === user!.name}>
          Save profile
        </button>
      </form>
      <div className="stack gap16">
        <div className="card card-pad stack gap8">
          <div className="card-title">RE:PLAY Cash</div>
          <div className="kpi-value">{sgd(balance, 2)}</div>
          <div className="row wrap">
            <Link className="btn btn-outline btn-sm" to="/wallet">
              Circular Wallet
            </Link>
            <Link className="btn btn-outline btn-sm" to="/dashboard">
              Dashboard
            </Link>
          </div>
        </div>
        <div className="card card-pad stack gap8">
          <div className="card-title">Settings</div>
          <label className="check">
            <input type="checkbox" checked={!state.fitReminderOff} onChange={(e) => setFitReminderOff(!e.target.checked)} />
            <span>Remind me to add body measurements when I sign in</span>
          </label>
          <div className="tiny muted">Only shows while you have no saved measurements.</div>
        </div>
      </div>
    </div>
  )
}

function MeasurementsSection() {
  const { state, setFitProfile, toast } = useStore()
  const saved = state.fitProfile
  const [editing, setEditing] = useState(!saved)
  const [draft, setDraft] = useState<FitDraft>(() => draftOf(saved))
  const [errors, setErrors] = useState<FitErrors>({})

  const save = () => {
    const res = validateFit(draft)
    setErrors(res.errors)
    if (!res.profile) return
    setFitProfile(res.profile)
    setEditing(false)
    toast({ title: 'Measurements saved', body: 'AI Fit Previews will use them automatically.', tone: 'success' })
  }

  return (
    <div className="card card-pad stack gap16" style={{ maxWidth: 640 }}>
      <div className="row between wrap">
        <div>
          <div className="card-title">Body Measurements · My Fit Profile</div>
          <div className="card-sub">Used only for your own transformation and AI Fit Previews — never shown on listings.</div>
        </div>
        {saved && !editing && (
          <button className="btn btn-outline btn-sm" onClick={() => (setDraft(draftOf(saved)), setEditing(true))}>
            <Pencil size={13} /> Edit
          </button>
        )}
      </div>
      {!editing && saved ? (
        <>
          <FitSummary profile={saved} />
          <button
            className="link-btn"
            style={{ alignSelf: 'flex-start', color: 'var(--danger)' }}
            onClick={() => {
              setFitProfile(null)
              setDraft(draftOf(null))
              setEditing(true)
              toast({ title: 'Measurements deleted', tone: 'info' })
            }}
          >
            Delete my measurements
          </button>
        </>
      ) : (
        <form
          className="stack gap16"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          {!saved && <p className="small muted">No measurements saved yet. Add them once and every fit preview can use them.</p>}
          <FitFields idPrefix="acc-fit" draft={draft} errors={errors} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} clearError={(k) => setErrors((x) => ({ ...x, [k]: undefined }))} />
          <div className="row wrap">
            <button type="submit" className="btn btn-accent">
              Save measurements
            </button>
            {saved && (
              <button type="button" className="btn btn-outline" onClick={() => (setEditing(false), setErrors({}))}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  )
}

const STATUS: Record<Listing['status'], { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'badge-accent' },
  sold: { label: 'Sold', cls: 'badge-dark' },
  removed: { label: 'Removed', cls: 'badge-outline' },
}

function ListingsSection() {
  const { myListings, updateListing, toast } = useStore()
  const nav = useNavigate()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">My Listings</div>
          <div className="card-sub">{myListings.filter((l) => l.status === 'active').length} active on the marketplace</div>
        </div>
        <Link to="/sell" className="btn btn-accent btn-sm">
          <Plus size={14} /> Sell an Item
        </Link>
      </div>
      {myListings.length === 0 ? (
        <div className="empty">
          You haven’t listed anything yet.{' '}
          <Link className="link" to="/sell">
            List your first item
          </Link>
        </div>
      ) : (
        <div>
          {myListings.map((l) => (
            <div key={l.id} className="listing-row">
              <ProductImage src={l.img} alt={l.name} className="listing-thumb" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="strong ellipsis">{l.name}</div>
                <div className="small muted">
                  {sgd(l.price, 2)} · listed {new Date(l.createdAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                </div>
              </div>
              <span className={`badge ${STATUS[l.status].cls}`}>{STATUS[l.status].label}</span>
              <div className="listing-actions">
                {l.status === 'active' && (
                  <>
                    <button className="btn btn-ghost btn-sm" onClick={() => nav(`/buy/${l.id}`)}>
                      <Eye size={13} /> View
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => nav(`/sell?edit=${l.id}`)}>
                      <Pencil size={13} /> Edit
                    </button>
                    {confirmId === l.id ? (
                      <button
                        className="btn btn-sm btn-outline"
                        style={{ color: 'var(--danger)' }}
                        onClick={async () => {
                          if (await updateListing(l.id, { status: 'removed' })) toast({ title: 'Listing removed', body: `${l.name} is no longer on the marketplace.`, tone: 'info' })
                          setConfirmId(null)
                        }}
                      >
                        Confirm remove
                      </button>
                    ) : (
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setConfirmId(l.id)}>
                        <Trash2 size={13} /> Remove
                      </button>
                    )}
                  </>
                )}
                {l.status === 'removed' && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={async () => {
                      if (await updateListing(l.id, { status: 'active' })) toast({ title: 'Listing is live again', body: l.name, tone: 'success' })
                    }}
                  >
                    <RotateCcw size={13} /> Relist
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PurchasesSection() {
  const { state } = useStore()
  const items = state.portfolio
  const STATUS_LABEL: Record<string, string> = { owned: 'In your collection', transforming: 'Transforming', transformed: 'Transformed', sold: 'Sold on', returned: 'Returned' }
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">My Purchases</div>
          <div className="card-sub">Items you own — transform any of them from here.</div>
        </div>
        <Link to="/discover" className="btn btn-outline btn-sm">
          Browse marketplace
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="empty">No purchases yet.</div>
      ) : (
        items.map((i) => (
          <div key={i.id} className="listing-row">
            <ItemVisual item={i} className="listing-thumb" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="strong ellipsis">{i.name}</div>
              <div className="small muted">
                Paid {sgd(i.bought + (i.shipping ?? 0), 2)} · {i.acquiredVia}
              </div>
            </div>
            <span className="badge">{STATUS_LABEL[i.status]}</span>
            <div className="listing-actions">
              {(i.status === 'owned' || i.status === 'transforming' || i.status === 'transformed') && (
                <Link className="btn btn-ghost btn-sm" to={`/transform/${i.id}`}>
                  {i.status === 'owned' ? 'Transform' : 'View'}
                </Link>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export default function Account() {
  const { user, ready, signOut } = useStore()
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const requested = params.get('tab') as Tab | null
  const tab: Tab = requested && TABS.some((t) => t.id === requested) ? requested : 'profile'
  // After signing in, wait for the account to load from the database, then continue.
  const [dest, setDest] = useState<string | null>(null)
  useEffect(() => {
    if (user && dest) nav(dest, { replace: true })
  }, [user, dest]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready || (dest && !user)) return <LoadingAccount />
  if (!user) return <AuthPanel onSignedIn={setDest} />

  return (
    <div className="container page">
      <PageHead
        eyebrow="Account"
        title={
          <span className="row" style={{ gap: 14 }}>
            <span className="avatar avatar-lg">{initials(user.name)}</span>
            Hi, {firstName(user.name)}
          </span>
        }
        subtitle={user.email}
        right={
          <button
            className="btn btn-outline"
            onClick={async () => {
              await signOut()
              nav('/')
            }}
          >
            <LogOut size={14} /> Log Out
          </button>
        }
      />
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'on' : ''}`} onClick={() => setParams(t.id === 'profile' ? {} : { tab: t.id }, { replace: true })}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {tab === 'profile' && <ProfileSection />}
      {tab === 'measurements' && <MeasurementsSection />}
      {tab === 'listings' && <ListingsSection />}
      {tab === 'purchases' && <PurchasesSection />}
      {tab === 'designs' && <SavedDesignsSection />}
      {tab === 'history' && <HistorySection />}
    </div>
  )
}

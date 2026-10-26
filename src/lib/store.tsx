import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  MATERIAL_LOTS,
  PRODUCTS,
  DELIVERY_FEE,
  DELIVERY_LABEL,
  orderTotals,
  splitDelivery,
  SEED_LEADERBOARD,
  SEED_PASSPORTS,
  SEED_PORTFOLIO,
  SEED_WALLET,
  valuate,
  type LeaderEntry,
  type Life,
  type Passport,
  type PortfolioItem,
  type Product,
  type WalletTx,
} from './data'
import type { RealtimeChannel, Session as AuthSession } from '@supabase/supabase-js'
import {
  EMAIL_RE,
  MIN_PASSWORD,
  authMessage,
  firstName,
  handleOf,
  listingFromRow,
  listingInputToRow,
  listingToProduct,
  normEmail,
  type Listing,
  type ListingInput,
  type ListingRow,
  type User,
} from './account'
import { LISTING_BUCKET, supabase, supabaseConfigured } from './supabase'
import type { ValueMap } from './engine'
import type { Idea } from './ideas'
import type { FitProfile } from './fit'
import type { Design, DesignStatus, MakerSpec, StyleProfile } from './studio'

export type Role = 'consumer' | 'brand' | 'creator'

export interface BrandEvent {
  id: string
  text: string
  amount: number
  at: string
}

export interface Pipeline {
  label: string
  units: number
  total: number
  originalValue: number
  liquidation: number
  channels: { label: string; units: number; revenue: number }[]
  appliedAt: string
}

export interface ActiveTransformation {
  itemId: string
  idea: Idea
  startedAt: string
  /** ALTER jobs keep the garment and return it to its owner; UPCYCLE (default) makes a new product */
  kind?: 'alter' | 'upcycle'
  /** History record for this job */
  designId?: string
  spec?: MakerSpec
}

/** A design as the studio hands it over — the store adds id, status and dates. */
export type DesignDraft = Omit<Design, 'id' | 'status' | 'createdAt' | 'updatedAt'> & { id?: string }

/** RE:PLAY+ in this prototype is a demo state — no payment is ever taken. */
export interface PlusState {
  since: string
  demo: true
}

interface State {
  role: Role
  wallet: WalletTx[]
  portfolio: PortfolioItem[]
  passports: Passport[]
  brand: {
    atRisk: number
    recovered: number
    recirculated: number
    recoveryRate: number
    pipeline: Pipeline | null
    events: BrandEvent[]
  }
  creator: { earnings: number; lots: string[]; listed: number }
  challenge: { status: 'idle' | 'acquired' | 'done'; route?: string; result?: number }
  leaderboard: LeaderEntry[]
  transformations: Record<string, ActiveTransformation>
  /** Product ids in the shopping bag — checked out together as one order */
  cart: string[]
  /** Body profile saved to this account for AI Fit Previews */
  fitProfile: FitProfile | null
  /** "Don't remind me again" — stop showing the measurement popup on sign-in */
  fitReminderOff: boolean
  /** RE:PLAY+ (demo subscription), null on the free plan */
  plus: PlusState | null
  /** Style preferences RE:PLAY+ personalises concepts with */
  styleProfile: StyleProfile | null
  /** Saved designs (Draft) and every confirmed transformation — the Transformation History */
  designs: Design[]
}

// Each account's demo state lives in its Supabase `profiles` row, so it follows the account across devices.
// Signed-out visitors browse on unsaved seed data.

const initialState = (): State => ({
  role: 'consumer',
  wallet: SEED_WALLET,
  portfolio: SEED_PORTFOLIO,
  passports: SEED_PASSPORTS,
  brand: {
    atRisk: 428500,
    recovered: 126240,
    recirculated: 18420,
    recoveryRate: 72,
    pipeline: null,
    events: [
      { id: 'e3', text: '100 pre-owned outerwear pieces sold this weekend', amount: 1840, at: '2026-09-22T18:20:00' },
      { id: 'e2', text: 'Maya Studio bought 40-pair denim lot', amount: 160, at: '2026-09-22T11:02:00' },
      { id: 'e1', text: '312 premium resale units sold this week', amount: 4990, at: '2026-09-21T09:00:00' },
    ],
  },
  creator: { earnings: 1284.5, lots: [], listed: 18 },
  challenge: { status: 'idle' },
  leaderboard: SEED_LEADERBOARD,
  transformations: {},
  cart: [],
  fitProfile: null,
  fitReminderOff: false,
  plus: null,
  styleProfile: null,
  designs: [],
})

interface ProfileRow {
  id: string
  name: string
  handle: string
  fit_profile: FitProfile | null
  fit_reminder_off: boolean
  state: Partial<State> | null
  created_at: string
}

/** A profile row → app state. Measurements and the reminder preference have their own columns. */
function stateFromProfile(p: ProfileRow): State {
  // Brand and creator views were removed — always open as the consumer, even if an older session saved another role.
  const s = { ...initialState(), ...(p.state ?? {}) }
  // Saved designs are user data — drop anything malformed rather than break the studio.
  const designs = Array.isArray(s.designs) ? s.designs.filter((d) => d && typeof d.id === 'string' && d.spec) : []
  return { ...s, designs, role: 'consumer', fitProfile: p.fit_profile ?? null, fitReminderOff: !!p.fit_reminder_off }
}

/** App state → the profile columns it is saved to. */
const profilePatch = (s: State) => ({ state: s, fit_profile: s.fitProfile, fit_reminder_off: s.fitReminderOff, updated_at: new Date().toISOString() })

interface Session {
  user: User | null
  state: State
  /** False until the saved sign-in (if any) has been restored on page load */
  ready: boolean
}

export interface Toast {
  id: number
  title: string
  body?: string
  tone?: 'success' | 'info' | 'error'
}

const nowIso = () => new Date().toISOString()
const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const passportId = () => `RPL-${String(10000 + Math.floor(Math.random() * 89999))}`

function useStoreValue() {
  const [session, setSession] = useState<Session>({ user: null, state: initialState(), ready: !supabaseConfigured })
  const { user, state, ready } = session
  const setState = useCallback((fn: State | ((s: State) => State)) => setSession((x) => ({ ...x, state: typeof fn === 'function' ? fn(x.state) : fn })), [])
  const [listings, setListings] = useState<Listing[]>([])
  const [listingsReady, setListingsReady] = useState(!supabaseConfigured)
  /** Set on sign-in when the body-measurement popup should show */
  const [fitPrompt, setFitPrompt] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)
  const who = user ? firstName(user.name) : 'you'

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++toastId.current
    setToasts((ts) => [...ts, { ...t, id }])
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3800)
  }, [])

  /* ---------------- Cloud sync of the signed-in account ---------------- */

  const userIdRef = useRef<string | null>(null)
  /** JSON of the state last written to / read from the database — skips no-op saves and echoes of our own writes */
  const syncedRef = useRef<string>('')
  const saveTimer = useRef<number | undefined>(undefined)
  const pendingRef = useRef<State | null>(null)
  /** Saves currently in flight — never overwrite local state with a read that may predate them */
  const savingRef = useRef(0)
  /** Explicit sign-in / sign-up (not a restored session) — may show the measurement popup */
  const promptNextLoad = useRef(false)

  const flushSave = useCallback(async () => {
    window.clearTimeout(saveTimer.current)
    const s = pendingRef.current
    const id = userIdRef.current
    if (!s || !id) return
    pendingRef.current = null
    savingRef.current++
    const { error } = await supabase.from('profiles').update(profilePatch(s)).eq('id', id)
    savingRef.current--
    if (error) {
      pendingRef.current = pendingRef.current ?? s
      saveTimer.current = window.setTimeout(() => void flushSave(), 4000)
    }
  }, [])

  // Every change to a signed-in user's state is saved to their profile (debounced).
  useEffect(() => {
    if (!user || userIdRef.current !== user.id) return
    const json = JSON.stringify(state)
    if (json === syncedRef.current) return
    syncedRef.current = json
    pendingRef.current = state
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => void flushSave(), 600)
  }, [user, state, flushSave])

  /** Applies a profile row read from the database (initial load, another device's change). */
  const applyProfile = useCallback((p: ProfileRow, email: string, createdAt: string) => {
    const next = stateFromProfile(p)
    syncedRef.current = JSON.stringify(next)
    setSession({ user: { id: p.id, name: p.name || email.split('@')[0], email, createdAt }, state: next, ready: true })
  }, [])

  const loadAccount = useCallback(
    async (auth: AuthSession) => {
      const u = auth.user
      let { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).maybeSingle<ProfileRow>()
      if (!p) {
        // Profile is normally created by the signup trigger — create it here if it's missing.
        const name = (u.user_metadata?.name as string | undefined) ?? u.email?.split('@')[0] ?? ''
        const res = await supabase.from('profiles').upsert({ id: u.id, name, handle: handleOf(name) }).select('*').single<ProfileRow>()
        p = res.data
      }
      if (!p) {
        toast({ title: 'Couldn’t load your account', body: 'Please refresh the page and try again.', tone: 'error' })
        setSession((x) => ({ ...x, ready: true }))
        return
      }
      userIdRef.current = u.id
      const isNew = !p.state
      applyProfile(p, u.email ?? '', u.created_at)
      if (isNew) {
        // First sign-in: save the starting demo data so every device sees the same account.
        pendingRef.current = stateFromProfile(p)
        void flushSave()
      }
      if (promptNextLoad.current) {
        promptNextLoad.current = false
        setFitPrompt(!p.fit_profile && !p.fit_reminder_off)
      }
    },
    [applyProfile, flushSave, toast],
  )

  // Restore the saved sign-in on load and follow sign-in / sign-out (including from other tabs).
  useEffect(() => {
    if (!supabaseConfigured) return
    const { data } = supabase.auth.onAuthStateChange((event, auth) => {
      // Supabase advises not to await other Supabase calls inside this callback.
      setTimeout(() => {
        if (auth?.user) {
          if (userIdRef.current === auth.user.id && event !== 'USER_UPDATED') return
          void loadAccount(auth)
        } else if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
          userIdRef.current = null
          pendingRef.current = null
          syncedRef.current = ''
          setFitPrompt(false)
          setSession({ user: null, state: initialState(), ready: true })
        }
      }, 0)
    })
    return () => data.subscription.unsubscribe()
  }, [loadAccount])

  /** Pulls the latest copy of this account (changes made on another device). */
  const refreshProfile = useCallback(async () => {
    const id = userIdRef.current
    if (!id || pendingRef.current || savingRef.current) return
    const { data: p } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle<ProfileRow>()
    if (!p || userIdRef.current !== id || pendingRef.current || savingRef.current) return
    const next = stateFromProfile(p)
    if (JSON.stringify(next) === syncedRef.current) return
    syncedRef.current = JSON.stringify(next)
    setSession((x) => (x.user ? { ...x, user: { ...x.user, name: p.name || x.user.name }, state: next } : x))
  }, [])

  /* ---------------- Marketplace listings (shared by everyone) ---------------- */

  const refreshListings = useCallback(async () => {
    if (!supabaseConfigured) return
    const { data, error } = await supabase.from('listings').select('*').order('created_at', { ascending: false }).limit(500)
    if (!error && data) setListings((data as ListingRow[]).map(listingFromRow))
    setListingsReady(true)
  }, [])

  // Initial listings + live updates: new listings, edits and sales show up on every open device.
  useEffect(() => {
    if (!supabaseConfigured) return
    void refreshListings()
    let t: number | undefined
    const soon = () => {
      window.clearTimeout(t)
      t = window.setTimeout(() => void refreshListings(), 250)
    }
    const ch: RealtimeChannel = supabase
      .channel('listings-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, soon)
      .subscribe()
    return () => {
      window.clearTimeout(t)
      void supabase.removeChannel(ch)
    }
  }, [refreshListings])

  // Live updates to this account from other devices.
  useEffect(() => {
    if (!supabaseConfigured || !user) return
    const ch = supabase
      .channel(`profile-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () => void refreshProfile())
      .subscribe()
    return () => void supabase.removeChannel(ch)
  }, [user?.id, refreshProfile]) // eslint-disable-line react-hooks/exhaustive-deps

  // Coming back to the tab: save anything pending, then catch up with other devices. Leaving: save now.
  useEffect(() => {
    if (!supabaseConfigured) return
    const onVisible = () => {
      if (document.visibilityState === 'hidden') {
        void flushSave()
        return
      }
      void refreshListings()
      void refreshProfile()
    }
    const onFocus = () => {
      void refreshListings()
      void refreshProfile()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)
    window.addEventListener('pagehide', flushSave)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pagehide', flushSave)
    }
  }, [flushSave, refreshListings, refreshProfile])

  /** Marketplace = seeded pre-owned products + every user's active listings (newest first), all in the same Product shape. */
  const listingProducts = useMemo(() => listings.map(listingToProduct), [listings])
  const products = useMemo(() => [...listingProducts.filter((p) => p.listingStatus === 'active'), ...PRODUCTS.filter((p) => p.section === 'resale')], [listingProducts])
  /** Any product by id, including listings that have since sold or been removed (for receipts and the owner's view). */
  const findProduct = useCallback((id: string | undefined): Product | undefined => PRODUCTS.find((p) => p.id === id) ?? listingProducts.find((p) => p.id === id), [listingProducts])

  const balance = useMemo(() => Math.round(state.wallet.reduce((s, t) => s + t.amount, 0) * 100) / 100, [state.wallet])

  const addTx = (s: State, tx: Omit<WalletTx, 'id' | 'date'>): State => ({
    ...s,
    wallet: [{ ...tx, id: uid('tx'), date: nowIso() }, ...s.wallet],
  })

  const addLife = (s: State, pid: string, life: Omit<Life, 'n'>): State => ({
    ...s,
    passports: s.passports.map((p) => {
      if (p.id !== pid) return p
      const real = p.lives.filter((l) => !l.potential)
      const potentials = p.lives.filter((l) => l.potential)
      const lives = [...real, { ...life, n: real.length + 1 }]
      // keep a projected material-recovery life at the end if one existed
      return { ...p, lives: [...lives, ...potentials.map((l, i) => ({ ...l, n: lives.length + 1 + i }))] }
    }),
  })

  const brandEvent = (s: State, text: string, amount: number, recirculated = 1): State => ({
    ...s,
    brand: {
      ...s.brand,
      recovered: s.brand.recovered + amount,
      recirculated: s.brand.recirculated + recirculated,
      events: [{ id: uid('ev'), text, amount, at: nowIso() }, ...s.brand.events].slice(0, 12),
    },
  })

  const updateItem = (s: State, id: string, patch: Partial<PortfolioItem>): State => ({
    ...s,
    portfolio: s.portfolio.map((i) => (i.id === id ? { ...i, ...patch } : i)),
  })

  const setRole = (role: Role) => setState((s) => ({ ...s, role }))

  /**
   * Checks out one order: item prices + ONE Singapore Local Delivery fee, however many items it holds.
   * Returns what was bought (product id → new portfolio item id), or null if nothing could be bought.
   */
  const buyOrder = async (productIds: string[]): Promise<{ productId: string; itemId: string }[] | null> => {
    if (!user) {
      toast({ title: 'Sign in to buy', body: 'Create a free RE:PLAY account or sign in to check out.', tone: 'info' })
      return null
    }
    const own = productIds.map(findProduct).find((p) => p?.sellerId === user.id)
    if (own) {
      toast({ title: 'This is your own listing', body: `${own.name} can’t be bought from yourself.`, tone: 'error' })
      return null
    }
    let products = productIds.map(findProduct).filter((p): p is Product => !!p && (!p.listingStatus || p.listingStatus === 'active'))
    if (!products.length) {
      toast({ title: 'Nothing to check out', body: 'These items are no longer available.', tone: 'error' })
      return null
    }
    const quoted = orderTotals(products.map((p) => p.price))
    if (balance < quoted.total) {
      toast({ title: 'Not enough RE:PLAY Cash', body: `You need S$${quoted.total.toFixed(2)} (incl. S$${quoted.delivery.toFixed(2)} ${DELIVERY_LABEL}). Add demo funds from your wallet.`, tone: 'error' })
      return null
    }
    // Users' listings are one-offs: claim them in the database first so the same item can't be sold twice.
    const listingIds = products.filter((p) => p.listingStatus).map((p) => p.id)
    if (listingIds.length) {
      const { data, error } = await supabase.rpc('buy_listings', { listing_ids: listingIds })
      if (error) {
        toast({ title: 'Checkout failed', body: 'Can’t reach RE:PLAY right now — you haven’t been charged. Please try again.', tone: 'error' })
        return null
      }
      const claimed = new Set((data as string[] | null) ?? [])
      const gone = products.filter((p) => p.listingStatus && !claimed.has(p.id))
      if (gone.length) {
        toast({ title: `${gone.map((p) => p.name).join(', ')} just sold`, body: 'Someone else bought it first — you haven’t been charged for it.', tone: 'error' })
        products = products.filter((p) => !gone.includes(p))
        setState((s) => ({ ...s, cart: s.cart.filter((c) => !gone.some((p) => p.id === c)) }))
      }
      setListings((ls) => ls.map((l) => (claimed.has(l.id) ? { ...l, status: 'sold' } : l)))
      void refreshListings()
      if (!products.length) return null
    }
    const { subtotal, delivery, total } = orderTotals(products.map((p) => p.price))
    // Each item carries its share of the one delivery fee, so cost bases add up to what was paid.
    const shares = splitDelivery(products.length)
    const lines = products.map((p, k) => ({ p, v: valuate(p), id: uid('i'), pid: passportId(), share: shares[k] }))
    setState((s) => {
      let n: State = {
        ...s,
        cart: s.cart.filter((c) => !productIds.includes(c)),
        portfolio: [
          ...lines.map(({ p, v, id, pid, share }): PortfolioItem => ({
            id,
            name: p.name,
            brand: p.brand,
            img: p.img,
            category: p.category,
            bought: p.price,
            shipping: share,
            sourceProductId: p.id,
            current: v.resaleValue,
            resale: v.resaleValue,
            transform: v.transformationValue,
            material: v.materialValue,
            guaranteed: Math.round(p.price * 0.7),
            lifeScore: Math.min(4, p.life + 1),
            passportId: pid,
            status: 'owned',
            acquiredVia: p.section === 'creator' ? 'Creator Originals' : p.section === 'materials' ? 'Materials' : 'RE:PLAY marketplace',
            fabric: p.material,
            condition: p.condition,
            conditionLabel: p.conditionLabel,
            garment: p.garment,
            colourName: p.colourName,
            colourHex: p.colourHex,
            size: p.size,
            pattern: p.pattern,
            style: p.style,
          })),
          ...s.portfolio,
        ],
        passports: [
          ...lines.map(({ p, v, pid }): Passport => ({
            id: pid,
            name: p.name,
            brand: p.brand,
            img: p.img,
            lives: [
              { n: 1, label: 'Original purchase', detail: `First owner — ${p.brand}`, value: p.originalPrice, date: '2025' },
              { n: 2, label: 'RE:PLAY purchase', detail: `Bought pre-owned by ${who} from ${p.seller ?? p.brand}`, value: p.price, date: 'Today' },
              { n: 3, label: 'Material recovery', detail: 'Graded fibre recovery at end of life', value: v.materialValue, date: 'Projected', potential: true },
            ],
          })),
          ...s.passports,
        ],
      }
      const what = products.length === 1 ? products[0].name : `Order of ${products.length} items`
      n = addTx(n, { label: 'Purchase', detail: `${what} — S$${subtotal.toFixed(2)} + S$${delivery.toFixed(2)} ${DELIVERY_LABEL}`, amount: -total, kind: 'purchase' })
      for (const { p } of lines) n = brandEvent(n, `${p.name} sold on the marketplace`, Math.round(p.price * 0.9))
      return n
    })
    return lines.map((l) => ({ productId: l.p.id, itemId: l.id }))
  }

  /** Buy now — a single-item order. Returns the new portfolio item id, or null. */
  const buyProduct = async (productId: string): Promise<string | null> => (await buyOrder([productId]))?.[0]?.itemId ?? null

  const addToCart = (productId: string) => {
    const p = findProduct(productId)
    if (!p) return
    if (!user) {
      toast({ title: 'Sign in to use your bag', tone: 'info' })
      return
    }
    if (p.sellerId === user.id) {
      toast({ title: 'This is your own listing', tone: 'error' })
      return
    }
    if (state.cart.includes(productId)) {
      toast({ title: 'Already in your bag', body: p.name, tone: 'info' })
      return
    }
    setState((s) => ({ ...s, cart: [...s.cart, productId] }))
    toast({ title: 'Added to your bag', body: `${p.name} — one ${DELIVERY_LABEL} fee covers the whole order.`, tone: 'success' })
  }

  const removeFromCart = (productId: string) => setState((s) => ({ ...s, cart: s.cart.filter((c) => c !== productId) }))

  /** Saves measurements to the signed-in account (never called for temporary preview measurements). */
  const setFitProfile = (fitProfile: FitProfile | null) => setState((s) => ({ ...s, fitProfile }))
  const setFitReminderOff = (fitReminderOff: boolean) => setState((s) => ({ ...s, fitReminderOff }))
  const dismissFitPrompt = () => setFitPrompt(false)

  /* ---------------- Accounts (Supabase Auth) ---------------- */

  const notConfigured = 'RE:PLAY accounts aren’t connected yet (Supabase keys missing).'

  /**
   * Creates an account and signs straight in. Returns an error message, or null on success.
   * If the Supabase project requires email confirmation, returns `{ confirm: true }` instead.
   */
  const signUp = async (name: string, email: string, password: string): Promise<string | { confirm: true } | null> => {
    if (!supabaseConfigured) return notConfigured
    const e = normEmail(email)
    if (!name.trim()) return 'Please enter your name.'
    if (!EMAIL_RE.test(e)) return 'Please enter a valid email address.'
    if (password.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters.`
    promptNextLoad.current = true
    const { data, error } = await supabase.auth.signUp({
      email: e,
      password,
      options: { data: { name: name.trim(), handle: handleOf(name) }, emailRedirectTo: `${window.location.origin}/discover` },
    })
    if (error) {
      promptNextLoad.current = false
      return authMessage(error.message)
    }
    // Supabase hides "already registered" behind a user with no identities when confirmation is on.
    if (data.user && !data.user.identities?.length) {
      promptNextLoad.current = false
      return 'An account with this email already exists. Sign in instead.'
    }
    if (!data.session) return { confirm: true }
    toast({ title: `Welcome to RE:PLAY, ${firstName(name)}`, body: 'Your account is ready and you’re signed in.', tone: 'success' })
    return null
  }

  /** Returns an error message, or null on success. */
  const signIn = async (email: string, password: string): Promise<string | null> => {
    if (!supabaseConfigured) return notConfigured
    promptNextLoad.current = true
    const { data, error } = await supabase.auth.signInWithPassword({ email: normEmail(email), password })
    if (error) {
      promptNextLoad.current = false
      return authMessage(error.message)
    }
    const name = (data.user.user_metadata?.name as string | undefined) ?? ''
    toast({ title: `Welcome back${name ? `, ${firstName(name)}` : ''}`, tone: 'success' })
    return null
  }

  /** Ends the session on this device only — the account, its listings and measurements stay saved. */
  const signOut = async () => {
    await flushSave()
    userIdRef.current = null
    syncedRef.current = ''
    setFitPrompt(false)
    setSession({ user: null, state: initialState(), ready: true })
    await supabase.auth.signOut({ scope: 'local' })
    toast({ title: 'You’ve signed out', body: 'Your account, listings and measurements are saved for next time.', tone: 'info' })
  }

  const updateName = async (name: string) => {
    if (!user || !name.trim()) return
    const { error } = await supabase.from('profiles').update({ name: name.trim() }).eq('id', user.id)
    if (error) {
      toast({ title: 'Couldn’t update your profile', body: 'Please try again.', tone: 'error' })
      return
    }
    setSession((x) => ({ ...x, user: x.user && { ...x.user, name: name.trim() } }))
    toast({ title: 'Profile updated', tone: 'success' })
  }

  /* ---------------- Listings ---------------- */

  const myListings = useMemo(() => (user ? listings.filter((l) => l.sellerId === user.id) : []), [listings, user])

  /** Uploads a new listing photo (data URL from the sell form) to Storage and returns its public URL. */
  const uploadPhoto = async (dataUrl: string): Promise<string | null> => {
    if (!user) return null
    const blob = await (await fetch(dataUrl)).blob()
    const path = `${user.id}/${crypto.randomUUID()}.jpg`
    const { error } = await supabase.storage.from(LISTING_BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
    if (error) return null
    return supabase.storage.from(LISTING_BUCKET).getPublicUrl(path).data.publicUrl
  }

  const listingError = (body = 'Check your connection and try again.') => toast({ title: 'Couldn’t save your listing', body, tone: 'error' })

  /** Publishes a listing for the signed-in user. Returns its id, or null. */
  const createListing = async (input: ListingInput): Promise<string | null> => {
    if (!user) return null
    const img = input.img.startsWith('data:') ? await uploadPhoto(input.img) : input.img
    if (!img) {
      listingError('The photo didn’t upload — please try again.')
      return null
    }
    const { data, error } = await supabase
      .from('listings')
      .insert({ ...listingInputToRow({ ...input, img }), seller_id: user.id, seller_handle: handleOf(user.name), status: 'active' })
      .select('*')
      .single<ListingRow>()
    if (error || !data) {
      listingError()
      return null
    }
    const l = listingFromRow(data)
    setListings((ls) => [l, ...ls.filter((x) => x.id !== l.id)])
    return l.id
  }

  /** Edits, removes or relists one of the signed-in user's own listings. */
  const updateListing = async (id: string, patch: Partial<ListingInput> & { status?: Listing['status'] }): Promise<boolean> => {
    if (!user) return false
    const { status, ...fields } = patch
    if (fields.img?.startsWith('data:')) {
      const url = await uploadPhoto(fields.img)
      if (!url) {
        listingError('The photo didn’t upload — please try again.')
        return false
      }
      fields.img = url
    }
    const row = { ...listingInputToRow(fields), ...(status ? { status } : {}), updated_at: nowIso() }
    const { data, error } = await supabase.from('listings').update(row).eq('id', id).eq('seller_id', user.id).select('*').single<ListingRow>()
    if (error || !data) {
      listingError(error?.code === 'PGRST116' ? 'This listing has already sold.' : undefined)
      void refreshListings()
      return false
    }
    const l = listingFromRow(data)
    setListings((ls) => ls.map((x) => (x.id === id ? l : x)))
    return true
  }

  const resellItem = (itemId: string) => {
    const item = state.portfolio.find((i) => i.id === itemId)
    if (!item) return
    const net = Math.round((item.current * 0.9 - DELIVERY_FEE) * 100) / 100
    setState((s) => {
      let n = updateItem(s, itemId, { status: 'sold' })
      n = addTx(n, { label: 'Resale', detail: `${item.name} sold — after 10% fee & S$${DELIVERY_FEE.toFixed(2)} ${DELIVERY_LABEL}`, amount: net, kind: 'resale' })
      n = addLife(n, item.passportId, { label: 'RE:PLAY resale', detail: `Resold by ${who} to a new owner`, value: item.current, date: 'Today' })
      return n
    })
    toast({ title: `Sold for S$${item.current}`, body: `S$${net.toFixed(2)} added to your RE:PLAY Cash.`, tone: 'success' })
  }

  const returnItem = (itemId: string) => {
    const item = state.portfolio.find((i) => i.id === itemId)
    if (!item) return
    setState((s) => {
      let n = updateItem(s, itemId, { status: 'returned' })
      n = addTx(n, { label: 'Return', detail: `${item.name} returned — guaranteed value`, amount: item.guaranteed, kind: 'return' })
      n = addLife(n, item.passportId, { label: 'Returned to RE:PLAY', detail: 'Re-graded and routed to its next highest-value channel', value: item.guaranteed, date: 'Today' })
      return n
    })
    toast({ title: `Returned for S$${item.guaranteed.toFixed(2)}`, body: 'Guaranteed value credited instantly.', tone: 'success' })
  }

  const keepItem = (itemId: string) => {
    const item = state.portfolio.find((i) => i.id === itemId)
    if (item) toast({ title: `${item.name} added to your collection`, body: 'Its value is tracked live — transform it any time.', tone: 'success' })
  }

  /** Adds or replaces a design record; new records go to the top of the history. */
  const putDesign = (s: State, draft: DesignDraft, status: DesignStatus): { s: State; id: string } => {
    const id = draft.id && s.designs.some((d) => d.id === draft.id) ? draft.id : uid('dz')
    const prev = s.designs.find((d) => d.id === id)
    const at = nowIso()
    const d: Design = { ...draft, id, status, createdAt: prev?.createdAt ?? at, updatedAt: at }
    return { s: { ...s, designs: [d, ...s.designs.filter((x) => x.id !== id)] }, id }
  }

  /** Pays the transformation cost and hands the item to its maker (with its maker-ready spec, if any). */
  const startTransformation = (itemId: string, idea: Idea, design?: DesignDraft): boolean => {
    if (balance < idea.cost) {
      toast({ title: 'Not enough RE:PLAY Cash', body: `The transformation costs S$${idea.cost}. Add demo funds from your wallet.`, tone: 'error' })
      return false
    }
    setState((s) => {
      const item = s.portfolio.find((i) => i.id === itemId)
      let n = updateItem(s, itemId, { status: 'transforming' })
      n = addTx(n, { label: 'Transformation cost', detail: `${idea.title} from your ${item?.garment ?? 'item'} — ${idea.maker}`, amount: -idea.cost, kind: 'transform' })
      let designId: string | undefined
      if (design) {
        const r = putDesign(n, design, 'Ready for Maker')
        n = r.s
        designId = r.id
      }
      return { ...n, transformations: { ...n.transformations, [itemId]: { itemId, idea, startedAt: nowIso(), kind: 'upcycle', designId, spec: design?.spec } } }
    })
    return true
  }

  /** ALTER: pays S$6 per area and sends the garment with its maker-ready spec to the matched maker. */
  const startAlteration = (itemId: string, idea: Idea, design: DesignDraft): boolean => {
    if (balance < idea.cost) {
      toast({ title: 'Not enough RE:PLAY Cash', body: `The alteration fee is S$${idea.cost}. Add demo funds from your wallet.`, tone: 'error' })
      return false
    }
    setState((s) => {
      const item = s.portfolio.find((i) => i.id === itemId)
      let n = updateItem(s, itemId, { status: 'transforming' })
      n = addTx(n, { label: 'Alteration fee', detail: `${design.spec.areas} on your ${item?.garment ?? 'item'} — ${idea.maker}`, amount: -idea.cost, kind: 'transform' })
      const r = putDesign(n, design, 'Ready for Maker')
      n = r.s
      return { ...n, transformations: { ...n.transformations, [itemId]: { itemId, idea, startedAt: nowIso(), kind: 'alter', designId: r.id, spec: design.spec } } }
    })
    return true
  }

  /** The altered garment comes back to its owner — same item, better fit, one more chapter in its passport. */
  const completeAlteration = (itemId: string): Design | null => {
    const t = state.transformations[itemId]
    const item = state.portfolio.find((i) => i.id === itemId)
    if (!t || !item || item.status !== 'transforming') return null
    const done = state.designs.find((d) => d.id === t.designId) ?? null
    setState((s) => {
      let n = updateItem(s, itemId, { status: 'owned' })
      n = addLife(n, item.passportId, { label: 'Alteration', detail: `${t.spec?.requested?.join(' · ') ?? 'Fit alteration'} by ${t.idea.maker}`, value: item.current, date: 'Today' })
      const rest = { ...n.transformations }
      delete rest[itemId]
      return {
        ...n,
        transformations: rest,
        designs: n.designs.map((d) => (d.id === t.designId ? { ...d, status: 'Completed' as const, updatedAt: nowIso() } : d)),
      }
    })
    toast({ title: 'Your alteration is done', body: `${item.name} is back with you, altered to fit.`, tone: 'success' })
    return done && { ...done, status: 'Completed' }
  }

  const setDesignStatus = (id: string | undefined, status: DesignStatus) => {
    if (!id) return
    setState((s) => ({ ...s, designs: s.designs.map((d) => (d.id === id && d.status !== status ? { ...d, status, updatedAt: nowIso() } : d)) }))
  }

  /** RE:PLAY+ only. Saves (or updates) a draft design. Returns its id, or null. */
  const saveDesign = (draft: DesignDraft): string | null => {
    if (!state.plus) {
      toast({ title: 'Saving designs is a RE:PLAY+ feature', body: 'Try the RE:PLAY+ demo to save and reopen designs.', tone: 'info' })
      return null
    }
    // Re-saving an open draft updates it; anything else becomes a new draft.
    const id = draft.id && state.designs.some((d) => d.id === draft.id && d.status === 'Draft') ? draft.id : uid('dz')
    setState((s) => putDesign(s, { ...draft, id }, 'Draft').s)
    toast({ title: 'Design saved', body: 'Find it in Account → Saved Designs.', tone: 'success' })
    return id
  }

  const deleteDesign = (id: string) => setState((s) => ({ ...s, designs: s.designs.filter((d) => d.id !== id) }))

  /** Prototype subscription: switches RE:PLAY+ on. No payment is taken. */
  const activatePlus = () => {
    if (state.plus) return
    setState((s) => ({ ...s, plus: { since: nowIso(), demo: true } }))
    toast({ title: 'RE:PLAY+ demo is on', body: 'All premium features unlocked. No payment taken — this is a prototype.', tone: 'success' })
  }
  const endPlus = () => {
    setState((s) => ({ ...s, plus: null }))
    toast({ title: 'Back on the free plan', body: 'Your saved designs are kept for when you come back.', tone: 'info' })
  }
  const setStyleProfile = (styleProfile: StyleProfile) => setState((s) => ({ ...s, styleProfile }))

  const completeTransformation = (itemId: string) => {
    const t = state.transformations[itemId]
    const item = state.portfolio.find((i) => i.id === itemId)
    if (!t || !item || item.status !== 'transforming') return
    const { idea } = t
    setState((s) => {
      let n = updateItem(s, itemId, {
        status: 'transformed',
        current: idea.sale,
        resale: idea.sale,
        transform: idea.sale,
        lifeScore: Math.min(4, item.lifeScore + 1),
        transformedInto: idea.title,
        name: `${idea.title} (from ${item.name})`,
        mock: idea.mock,
      })
      n = addLife(n, item.passportId, {
        label: 'Transformation',
        detail: `Second-hand ${item.garment ?? 'item'} turned into a ${idea.title.toLowerCase()}${idea.maker === 'DIY kit' ? ' (DIY kit)' : ` by ${idea.maker}`}`,
        value: idea.sale,
        date: 'Today',
      })
      n = { ...n, passports: n.passports.map((p) => (p.id === item.passportId ? { ...p, mock: idea.mock } : p)) }
      if (t.designId) n = { ...n, designs: n.designs.map((d) => (d.id === t.designId ? { ...d, status: 'Completed' as const, updatedAt: nowIso() } : d)) }
      if (idea.maker !== 'DIY kit') {
        n = { ...n, creator: { ...n.creator, earnings: n.creator.earnings + idea.cost } }
      }
      return n
    })
  }

  const sellTransformed = (itemId: string) => {
    const t = state.transformations[itemId]
    const item = state.portfolio.find((i) => i.id === itemId)
    if (!t || !item) return
    const { idea } = t
    setState((s) => {
      let n = updateItem(s, itemId, { status: 'sold' })
      n = addTx(n, { label: 'Transformation sale', detail: `${idea.title} sold — S$${idea.sale} less S$${idea.shippingOut.toFixed(2)} ${DELIVERY_LABEL}`, amount: idea.sale - idea.shippingOut, kind: 'transform' })
      n = addLife(n, item.passportId, { label: 'New customer', detail: `${idea.title} bought by a new owner`, value: idea.sale, date: 'Today' })
      return n
    })
    const profit = idea.profit
    toast({ title: `Sold for S$${idea.sale}`, body: `S$${(idea.sale - idea.shippingOut).toFixed(2)} credited after delivery — ${profit >= 0 ? '+' : '−'}S$${Math.abs(profit).toFixed(2)} profit overall.`, tone: 'success' })
  }

  const withdraw = (amount: number) => {
    if (amount <= 0 || amount > balance) {
      toast({ title: 'Invalid amount', tone: 'error' })
      return
    }
    setState((s) => addTx(s, { label: 'Withdrawal', detail: 'To DBS ••• 4821 (simulated)', amount: -amount, kind: 'withdraw' }))
    toast({ title: `S$${amount.toFixed(2)} withdrawal simulated`, body: 'No real money moves in this prototype.', tone: 'info' })
  }

  const addDemoFunds = () => {
    setState((s) => addTx(s, { label: 'Demo top-up', detail: 'Simulated balance for judging', amount: 50, kind: 'topup' }))
    toast({ title: 'S$50.00 demo funds added', tone: 'success' })
  }

  const applyAllocation = (map: ValueMap, label: string) => {
    const early = Math.round(map.allocations[0].perUnit * 120 + map.allocations[2].perUnit * 150)
    setState((s) => {
      let n: State = {
        ...s,
        brand: {
          ...s.brand,
          atRisk: Math.max(0, s.brand.atRisk - map.originalValue),
          recoveryRate: Math.min(96, s.brand.recoveryRate + 6),
          pipeline: {
            label,
            units: map.input.inventoryQuantity,
            total: map.totalRecovery,
            originalValue: map.originalValue,
            liquidation: map.liquidationTotal,
            channels: map.allocations.map((a) => ({ label: a.label, units: a.units, revenue: a.revenue })),
            appliedAt: nowIso(),
          },
        },
      }
      n = brandEvent(n, `First-hour sell-through: 120 premium resale + 150 creator units`, early, 270)
      return n
    })
    toast({ title: 'Allocation applied', body: `${map.input.inventoryQuantity.toLocaleString()} units routed to 4 channels. Early sales: +S$${early.toLocaleString()}.`, tone: 'success' })
  }

  const acquireLot = (lotId: string) => {
    const lot = MATERIAL_LOTS.find((l) => l.id === lotId)
    if (!lot || state.creator.lots.includes(lotId)) return
    setState((s) => {
      let n: State = { ...s, creator: { ...s.creator, lots: [...s.creator.lots, lotId], earnings: s.creator.earnings - lot.price } }
      n = brandEvent(n, `Maya Studio bought ${lot.name.toLowerCase()}`, lot.price, lot.units)
      return n
    })
    toast({ title: 'Lot acquired', body: `${lot.units} units reserved. Projected output value S$${lot.potential.toLocaleString()}.`, tone: 'success' })
  }

  const startChallenge = () => {
    if (balance < 5) {
      toast({ title: 'Not enough RE:PLAY Cash', tone: 'error' })
      return
    }
    setState((s) => ({ ...addTx(s, { label: 'Challenge entry', detail: 'Second-hand T-shirt — “Turn S$5 into S$30”', amount: -5, kind: 'challenge' }), challenge: { status: 'acquired' } }))
    toast({ title: 'Second-hand T-shirt acquired for S$5', body: 'Pick a route to grow its value.', tone: 'success' })
  }

  const completeChallenge = (route: string, result: number) => {
    setState((s) => {
      const board = [...s.leaderboard.filter((e) => !e.you), { name: `You (${who})`, result, route, you: true }].sort((a, b) => b.result - a.result)
      return {
        ...addTx(s, { label: 'Challenge payout', detail: `${route} route — second-hand T-shirt sold`, amount: result, kind: 'challenge' }),
        challenge: { status: 'done', route, result },
        leaderboard: board,
      }
    })
  }

  const resetChallenge = () => setState((s) => ({ ...s, challenge: { status: 'idle' } }))

  const resetDemo = () => {
    // Demo balances reset; the account's saved measurements and reminder preference are kept.
    setState((s) => ({ ...initialState(), fitProfile: s.fitProfile, fitReminderOff: s.fitReminderOff, plus: s.plus, styleProfile: s.styleProfile }))
    toast({ title: 'Demo reset', body: 'All balances and inventory restored.', tone: 'info' })
  }

  return {
    state,
    user,
    ready,
    listingsReady,
    configured: supabaseConfigured,
    products,
    findProduct,
    myListings,
    createListing,
    updateListing,
    signUp,
    signIn,
    signOut,
    updateName,
    fitPrompt,
    dismissFitPrompt,
    setFitReminderOff,
    balance,
    toasts,
    toast,
    setRole,
    buyProduct,
    buyOrder,
    addToCart,
    removeFromCart,
    setFitProfile,
    resellItem,
    returnItem,
    keepItem,
    startTransformation,
    completeTransformation,
    startAlteration,
    completeAlteration,
    setDesignStatus,
    saveDesign,
    deleteDesign,
    activatePlus,
    endPlus,
    setStyleProfile,
    sellTransformed,
    withdraw,
    addDemoFunds,
    applyAllocation,
    acquireLot,
    startChallenge,
    completeChallenge,
    resetChallenge,
    resetDemo,
    dismissToast: (id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)),
  }
}

type Store = ReturnType<typeof useStoreValue>
const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue()
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside provider')
  return s
}

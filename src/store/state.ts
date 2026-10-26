/**
 * The per-account app state and how it maps to the Supabase `profiles` row.
 * Kept free of React so it can be unit-tested on its own.
 */
import { SEED_PASSPORTS, SEED_PORTFOLIO, SEED_WALLET, type Passport, type PortfolioItem, type WalletTx } from '../data/demo-account'
import type { FitProfile } from '../lib/fit'
import type { Idea } from '../lib/ideas'
import type { Design, MakerSpec, StyleProfile } from '../lib/studio'

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

export interface State {
  wallet: WalletTx[]
  portfolio: PortfolioItem[]
  passports: Passport[]
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
export const initialState = (): State => ({
  wallet: SEED_WALLET,
  portfolio: SEED_PORTFOLIO,
  passports: SEED_PASSPORTS,
  transformations: {},
  cart: [],
  fitProfile: null,
  fitReminderOff: false,
  plus: null,
  styleProfile: null,
  designs: [],
})

const STATE_KEYS = Object.keys(initialState()) as (keyof State)[]

export interface ProfileRow {
  id: string
  name: string
  handle: string
  fit_profile: FitProfile | null
  fit_reminder_off: boolean
  state: Partial<State> | null
  created_at: string
}

/** A profile row → app state. Measurements and the reminder preference have their own columns. */
export function stateFromProfile(p: ProfileRow): State {
  const saved: Partial<State> = p.state ?? {}
  // Keep only the fields this version knows — older saves also carry state from the removed brand/creator/challenge views.
  const s = Object.fromEntries(STATE_KEYS.map((k) => [k, k in saved ? saved[k] : initialState()[k]])) as unknown as State
  // Saved designs are user data — drop anything malformed rather than break the studio.
  const designs = Array.isArray(s.designs) ? s.designs.filter((d) => d && typeof d.id === 'string' && d.spec) : []
  return { ...s, designs, fitProfile: p.fit_profile ?? null, fitReminderOff: !!p.fit_reminder_off }
}

/** App state → the profile columns it is saved to. */
export const profilePatch = (s: State) => ({ state: s, fit_profile: s.fitProfile, fit_reminder_off: s.fitReminderOff, updated_at: new Date().toISOString() })

/**
 * RE:PLAY accounts: the signed-in user, name/handle helpers and sign-in validation.
 * Accounts use Supabase Auth; each profile is a row in `profiles` (supabase/schema.sql).
 */

/** What the app knows about the signed-in user. */
export interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?'
/** Public seller handle shown on listings, e.g. "@mei.tan" — never the email. */
export const handleOf = (name: string) => `@${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '') || 'seller'}`

export const normEmail = (e: string) => e.trim().toLowerCase()
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const MIN_PASSWORD = 8

/**
 * The `?next=` path to return to after signing in, if it is a same-site path.
 * Rejects protocol-relative ("//host") and backslash ("/\host") forms that browsers treat as other origins.
 */
export const safeRedirect = (next: string | null): string | null => (next && /^\/(?![/\\])/.test(next) && !next.includes('\\') ? next : null)

/** Turns Supabase Auth errors into plain messages. */
export function authMessage(raw: string): string {
  const m = raw.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Email or password is incorrect.'
  if (m.includes('already registered') || m.includes('already been registered')) return 'An account with this email already exists. Sign in instead.'
  if (m.includes('email not confirmed')) return 'Please confirm your email first — check your inbox for the link from RE:PLAY, then sign in.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts — please wait a minute and try again.'
  if (m.includes('password')) return raw
  if (m.includes('failed to fetch') || m.includes('network')) return 'Can’t reach RE:PLAY right now — check your connection and try again.'
  return raw || 'Something went wrong — please try again.'
}

import { describe, expect, it } from 'vitest'
import { initialState, profilePatch, stateFromProfile, type ProfileRow } from './state'

const row = (state: unknown, extra: Partial<ProfileRow> = {}): ProfileRow => ({
  id: 'u-1',
  name: 'Mei',
  handle: '@mei',
  fit_profile: null,
  fit_reminder_off: false,
  state: state as ProfileRow['state'],
  created_at: '2026-10-01T00:00:00Z',
  ...extra,
})

describe('stateFromProfile', () => {
  it('starts a new account on the seeded demo data', () => {
    expect(stateFromProfile(row(null))).toEqual(initialState())
  })

  it('keeps saved fields and drops state from removed features', () => {
    const s = stateFromProfile(row({ cart: ['p-1'], role: 'brand', brand: { atRisk: 1 }, leaderboard: [] }))
    expect(s.cart).toEqual(['p-1'])
    expect(Object.keys(s).sort()).toEqual(Object.keys(initialState()).sort())
  })

  it('drops malformed saved designs instead of breaking the studio', () => {
    const s = stateFromProfile(row({ designs: [null, { id: 7 }, { id: 'dz-1' }, { id: 'dz-2', spec: {} }] }))
    expect(s.designs.map((d) => d.id)).toEqual(['dz-2'])
  })

  it('reads measurements and the reminder preference from their own columns', () => {
    const fit = { model: 'neutral' as const, height: 170, bust: 90, waist: 75, hips: 96 }
    const s = stateFromProfile(row({ fitProfile: null }, { fit_profile: fit, fit_reminder_off: true }))
    expect(s.fitProfile).toEqual(fit)
    expect(s.fitReminderOff).toBe(true)
  })
})

describe('profilePatch', () => {
  it('mirrors measurements into their columns', () => {
    const s = { ...initialState(), fitReminderOff: true }
    expect(profilePatch(s)).toMatchObject({ state: s, fit_profile: null, fit_reminder_off: true })
  })
})

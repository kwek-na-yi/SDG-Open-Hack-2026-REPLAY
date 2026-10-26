import { describe, expect, it } from 'vitest'
import { authMessage, firstName, handleOf, initials, safeRedirect } from './account'

describe('safeRedirect', () => {
  it.each(['/bag', '/buy/p-levis-jacket', '/transform/i-nike?mode=alter'])('allows the app path %s', (path) => {
    expect(safeRedirect(path)).toBe(path)
  })

  it.each([null, '', 'bag', 'https://evil.example', '//evil.example', '/\\evil.example', '/a\\b'])('rejects %s', (path) => {
    expect(safeRedirect(path)).toBeNull()
  })
})

describe('name helpers', () => {
  it('builds a public handle without exposing the email', () => {
    expect(handleOf('Mei Tan')).toBe('@mei.tan')
    expect(handleOf('  ')).toBe('@seller')
  })

  it('derives first names and initials', () => {
    expect(firstName('Mei Ling Tan')).toBe('Mei')
    expect(initials('mei ling tan')).toBe('ML')
    expect(initials('')).toBe('?')
  })
})

describe('authMessage', () => {
  it('turns Supabase errors into plain language', () => {
    expect(authMessage('Invalid login credentials')).toBe('Email or password is incorrect.')
    expect(authMessage('TypeError: Failed to fetch')).toMatch(/connection/)
  })
})

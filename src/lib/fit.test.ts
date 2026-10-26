import { describe, expect, it } from 'vitest'
import { draftOf, estimateSize, validateFit, type FitProfile } from './fit'

const valid = { model: 'female' as const, height: '165', bust: '86', waist: '68', hips: '94', size: '' as const }

describe('validateFit', () => {
  it('accepts plausible measurements and rounds to 0.1 cm', () => {
    const { profile, errors } = validateFit({ ...valid, waist: '68.04' })
    expect(errors).toEqual({})
    expect(profile).toMatchObject({ model: 'female', height: 165, bust: 86, waist: 68, hips: 94 })
  })

  it('reports each missing, non-numeric or out-of-range field', () => {
    const { profile, errors } = validateFit({ ...valid, height: '', bust: 'abc', hips: '300' })
    expect(profile).toBeNull()
    expect(Object.keys(errors).sort()).toEqual(['bust', 'height', 'hips'])
  })

  it('round-trips through the form draft', () => {
    const p: FitProfile = { model: 'male', height: 178, bust: 98, waist: 84, hips: 100, size: 'M' }
    expect(validateFit(draftOf(p)).profile).toEqual(p)
  })
})

describe('estimateSize', () => {
  it('sizes by the largest measurement bucket', () => {
    expect(estimateSize({ model: 'female', height: 165, bust: 80, waist: 62, hips: 86 })).toBe('XS')
    expect(estimateSize({ model: 'female', height: 165, bust: 80, waist: 62, hips: 120 })).toBe('XXL')
  })
})

import { describe, expect, it } from 'vitest'
import { SEED_PORTFOLIO } from '../data/demo-account'
import { DELIVERY_FEE } from './orders'
import { EMPTY_FILTERS, profileOf, recommend } from './ideas'

const profiles = SEED_PORTFOLIO.map(profileOf)

describe('recommend', () => {
  it.each(profiles.map((p) => [p.name, p] as const))('returns exactly three distinct ideas for %s', (_, p) => {
    const set = recommend(p, EMPTY_FILTERS, 0)
    expect(set.ideas).toHaveLength(3)
    expect(new Set(set.ideas.map((i) => i.id)).size).toBe(3)
  })

  it('is deterministic for the same garment, filters and round', () => {
    const p = profiles[0]
    expect(recommend(p, EMPTY_FILTERS, 1)).toEqual(recommend(p, EMPTY_FILTERS, 1))
  })

  it('works out profit from the full cost basis', () => {
    for (const idea of recommend(profiles[1], EMPTY_FILTERS, 0).ideas) {
      expect(idea.investment).toBeCloseTo(profiles[1].acquisition + idea.cost + DELIVERY_FEE, 2)
      expect(idea.profit).toBeCloseTo(idea.sale - idea.investment, 2)
    }
  })

  it('labels the closest alternatives when filters cannot be fully met', () => {
    const set = recommend(profiles[0], { ...EMPTY_FILTERS, minProfit: 30, budget: 'u5', difficulties: ['Advanced'] }, 0)
    expect(set.ideas).toHaveLength(3)
    const alternatives = set.ideas.slice(set.exact)
    expect(alternatives.every((i) => i.misses.length > 0)).toBe(true)
  })
})

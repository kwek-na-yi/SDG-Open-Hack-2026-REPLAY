import { describe, expect, it } from 'vitest'
import { DELIVERY_FEE, orderTotals, splitDelivery } from './orders'

describe('orderTotals', () => {
  it('charges one delivery fee per order, however many items it holds', () => {
    expect(orderTotals([25])).toEqual({ subtotal: 25, delivery: DELIVERY_FEE, total: 27.99 })
    expect(orderTotals([25, 24, 38])).toEqual({ subtotal: 87, delivery: DELIVERY_FEE, total: 89.99 })
  })

  it('charges nothing for an empty order', () => {
    expect(orderTotals([])).toEqual({ subtotal: 0, delivery: 0, total: 0 })
  })

  it('rounds to the cent', () => {
    expect(orderTotals([0.1, 0.2]).subtotal).toBe(0.3)
  })
})

describe('splitDelivery', () => {
  it.each([1, 2, 3, 7])('splits the fee across %i items to the cent', (n) => {
    const shares = splitDelivery(n)
    expect(shares).toHaveLength(n)
    expect(Math.round(shares.reduce((s, x) => s + x, 0) * 100)).toBe(Math.round(DELIVERY_FEE * 100))
    expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(0.01 + 1e-9)
  })

  it('returns no shares for no items', () => {
    expect(splitDelivery(0)).toEqual([])
  })
})

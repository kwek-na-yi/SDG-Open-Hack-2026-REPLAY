import { describe, expect, it } from 'vitest'
import { allocateInventory, calculateCircularValue, type ProductInput } from './engine'

const jacket: ProductInput = { originalPrice: 89, condition: 0.85, category: 'jacket', material: 'denim', brand: "Levi's", demand: 0.3, age: 0.3 }

describe('calculateCircularValue', () => {
  it('is deterministic', () => {
    expect(calculateCircularValue(jacket)).toEqual(calculateCircularValue({ ...jacket }))
  })

  it('recommends the channel with the highest estimated value', () => {
    const v = calculateCircularValue(jacket)
    expect(v.estimatedRecovery).toBe(Math.max(v.resaleValue, v.transformationValue, v.materialValue))
    expect(v.lifePotential).toBeGreaterThanOrEqual(1)
    expect(v.lifePotential).toBeLessThanOrEqual(4)
  })

  it('values better-condition items higher on resale', () => {
    const worn = calculateCircularValue({ ...jacket, condition: 0.4 })
    const crisp = calculateCircularValue({ ...jacket, condition: 0.95 })
    expect(crisp.resaleValue).toBeGreaterThan(worn.resaleValue)
  })

  it('clamps out-of-range scores instead of producing negative values', () => {
    const v = calculateCircularValue({ ...jacket, condition: 2, demand: -1, age: 5 })
    expect(v.resaleValue).toBeGreaterThanOrEqual(0)
    expect(v.materialValue).toBeGreaterThanOrEqual(0)
  })
})

describe('allocateInventory', () => {
  it.each([0.3, 0.6, 0.95])('routes every unit to a channel (condition %f)', (condition) => {
    const map = allocateInventory({ ...jacket, condition, inventoryQuantity: 10000 })
    expect(map.allocations).toHaveLength(4)
    expect(map.allocations.reduce((s, a) => s + a.units, 0)).toBe(10000)
    expect(map.allocations.every((a) => a.units >= 0)).toBe(true)
  })

  it('reports recovery as the sum of channel revenue', () => {
    const map = allocateInventory({ ...jacket, inventoryQuantity: 500 })
    expect(map.totalRecovery).toBe(map.allocations.reduce((s, a) => s + a.revenue, 0))
    expect(map.difference).toBe(map.totalRecovery - map.liquidationTotal)
  })
})

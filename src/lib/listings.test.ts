import { describe, expect, it } from 'vitest'
import { listingFromRow, listingInputToRow, listingToProduct, type ListingRow } from './listings'

const row: ListingRow = {
  id: 'l-1',
  seller_id: 'u-1',
  seller_handle: '@mei.tan',
  img: 'https://example.com/a.jpg',
  name: 'Corduroy Jacket',
  price: '24.50',
  category: 'jacket',
  condition: 'good',
  status: 'active',
  brand: null,
  size: 'M',
  material: null,
  original_price: null,
  description: null,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: null,
}

describe('listings', () => {
  it('maps a database row to a listing, converting numeric strings', () => {
    const l = listingFromRow(row)
    expect(l.price).toBe(24.5)
    expect(l.brand).toBeUndefined()
    expect(l.originalPrice).toBeUndefined()
  })

  it('renders a listing as a marketplace product with sensible defaults', () => {
    const p = listingToProduct(listingFromRow(row))
    expect(p).toMatchObject({ id: 'l-1', brand: 'Unbranded', material: 'cotton', seller: '@mei.tan', sellerId: 'u-1', listingStatus: 'active', conditionLabel: 'Pre-owned — good' })
    expect(p.originalPrice).toBeGreaterThan(p.price)
  })

  it('only writes the fields a seller provided', () => {
    expect(listingInputToRow({ name: 'Tee', brand: undefined })).toEqual({ name: 'Tee', brand: null })
  })
})

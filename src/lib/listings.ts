/**
 * Marketplace listings created by users: types, form options, and mapping
 * between Supabase `listings` rows and the Product shape the UI renders.
 */
import type { Product } from '../data/catalog'
import type { Category, Material } from './engine'

export type ListingStatus = 'active' | 'sold' | 'removed'

export interface Listing {
  id: string
  sellerId: string
  sellerHandle: string
  /** Public photo URL (Supabase Storage); a data URL only while a new photo is being edited */
  img: string
  name: string
  price: number
  category: Category
  condition: ConditionId
  status: ListingStatus
  brand?: string
  size?: string
  material?: Material
  originalPrice?: number
  description?: string
  createdAt: string
  updatedAt?: string
}

export type ListingInput = Omit<Listing, 'id' | 'sellerId' | 'sellerHandle' | 'status' | 'createdAt' | 'updatedAt'>

export type ConditionId = 'like-new' | 'excellent' | 'very-good' | 'good' | 'fair'
export const CONDITIONS: { id: ConditionId; label: string; score: number }[] = [
  { id: 'like-new', label: 'Pre-owned — like new', score: 0.95 },
  { id: 'excellent', label: 'Pre-owned — excellent', score: 0.9 },
  { id: 'very-good', label: 'Pre-owned — very good', score: 0.85 },
  { id: 'good', label: 'Pre-owned — good', score: 0.75 },
  { id: 'fair', label: 'Pre-owned — fair', score: 0.6 },
]

export const CATEGORY_OPTIONS: { id: Category; label: string }[] = [
  { id: 'shirt', label: 'T-shirt / top' },
  { id: 'hoodie', label: 'Hoodie' },
  { id: 'knitwear', label: 'Knitwear / sweatshirt' },
  { id: 'jacket', label: 'Jacket / coat' },
  { id: 'denim', label: 'Jeans' },
  { id: 'trousers', label: 'Trousers' },
  { id: 'skirt', label: 'Skirt / shorts' },
  { id: 'dress', label: 'Dress' },
  { id: 'sneaker', label: 'Shoes' },
  { id: 'bag', label: 'Bag / accessory' },
]

export const MATERIAL_OPTIONS: { id: Material; label: string }[] = [
  { id: 'cotton', label: 'Cotton' },
  { id: 'denim', label: 'Denim' },
  { id: 'polyester', label: 'Polyester' },
  { id: 'wool', label: 'Wool' },
  { id: 'leather', label: 'Leather' },
  { id: 'nylon', label: 'Nylon' },
  { id: 'blend', label: 'Blend / not sure' },
]

const defaultMaterial = (c: Category): Material => (c === 'denim' ? 'denim' : c === 'sneaker' ? 'blend' : c === 'bag' ? 'nylon' : 'cotton')

/** When the seller doesn't know the retail price — a typical pre-owned price is ~35–40% of retail. */
export const estimateOriginal = (price: number) => Math.max(Math.round(price / 0.38), Math.ceil(price) + 1)

/** A seller's listing in the exact shape of every other marketplace product, so it renders with the same card. */
export function listingToProduct(l: Listing): Product {
  const cond = CONDITIONS.find((c) => c.id === l.condition) ?? CONDITIONS[2]
  return {
    id: l.id,
    name: l.name,
    brand: l.brand?.trim() || 'Unbranded',
    img: l.img,
    section: 'resale',
    category: l.category,
    material: l.material ?? defaultMaterial(l.category),
    originalPrice: l.originalPrice && l.originalPrice > l.price ? l.originalPrice : estimateOriginal(l.price),
    price: l.price,
    condition: cond.score,
    demand: 0.6,
    age: 0.5,
    rarity: 'Common',
    life: 2,
    conditionLabel: cond.label,
    size: l.size?.trim() || undefined,
    seller: l.sellerHandle,
    sellerId: l.sellerId,
    description: l.description?.trim() || undefined,
    listingStatus: l.status,
  }
}

/* ------------------------------------------------------------------ */
/* Database rows (snake_case) <-> app objects                          */
/* ------------------------------------------------------------------ */

export interface ListingRow {
  id: string
  seller_id: string
  seller_handle: string
  img: string
  name: string
  price: number | string
  category: string
  condition: string
  status: ListingStatus
  brand: string | null
  size: string | null
  material: string | null
  original_price: number | string | null
  description: string | null
  created_at: string
  updated_at: string | null
}

const num = (v: number | string | null): number | undefined => (v === null || v === undefined ? undefined : Number(v))

export const listingFromRow = (r: ListingRow): Listing => ({
  id: r.id,
  sellerId: r.seller_id,
  sellerHandle: r.seller_handle,
  img: r.img,
  name: r.name,
  price: Number(r.price),
  category: r.category as Category,
  condition: r.condition as ConditionId,
  status: r.status,
  brand: r.brand ?? undefined,
  size: r.size ?? undefined,
  material: (r.material as Material | null) ?? undefined,
  originalPrice: num(r.original_price),
  description: r.description ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at ?? undefined,
})

/** Columns a seller may write (status and ownership are handled separately). */
export const listingInputToRow = (l: Partial<ListingInput>) => {
  const row: Record<string, unknown> = {}
  if (l.img !== undefined) row.img = l.img
  if (l.name !== undefined) row.name = l.name
  if (l.price !== undefined) row.price = l.price
  if (l.category !== undefined) row.category = l.category
  if (l.condition !== undefined) row.condition = l.condition
  if ('brand' in l) row.brand = l.brand ?? null
  if ('size' in l) row.size = l.size ?? null
  if ('material' in l) row.material = l.material ?? null
  if ('originalPrice' in l) row.original_price = l.originalPrice ?? null
  if ('description' in l) row.description = l.description ?? null
  return row
}

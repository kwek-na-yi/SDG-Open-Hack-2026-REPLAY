/**
 * Starting data for every new account (wallet, owned items and Life
 * Passports). Saved to the account's Supabase profile on first sign-in.
 */
import type { MockSpec } from '../lib/mock'
import type { Category, Material } from '../lib/engine'
import { IMG, type GarmentAttrs } from './catalog'

export interface Life {
  n: number
  label: string
  detail: string
  value: number
  date: string
  potential?: boolean
}

export interface Passport {
  id: string
  name: string
  brand: string
  img: string
  mock?: MockSpec
  lives: Life[]
}

export const SEED_PASSPORTS: Passport[] = [
  {
    id: 'RPL-84921', name: 'Nike Jacket', brand: 'Nike', img: IMG.bomberJacket,
    lives: [
      { n: 1, label: 'Original purchase', detail: 'Bought new, Orchard Road', value: 90, date: 'Mar 2023' },
      { n: 2, label: 'RE:PLAY resale', detail: 'Resold via RE:PLAY after 14 months', value: 35, date: 'Jun 2024' },
      { n: 3, label: 'Creator transformation', detail: 'Reworked by Maya Studio into a patchwork jacket', value: 63, date: 'Feb 2026' },
      { n: 4, label: 'Material recovery', detail: 'Graded fibre recovery at end of life', value: 12, date: 'Projected', potential: true },
    ],
  },
  {
    id: 'RPL-73318', name: 'Nike Jacket', brand: 'Nike', img: IMG.bomberJacket,
    lives: [
      { n: 1, label: 'Original purchase', detail: 'Bought new, Nike Orchard', value: 90, date: 'Jan 2023' },
      { n: 2, label: 'RE:PLAY resale', detail: 'Bought by you on RE:PLAY', value: 18, date: 'May 2026' },
    ],
  },
  {
    id: 'RPL-51207', name: 'Vintage 501 Jeans', brand: "Levi's", img: IMG.rippedJeans,
    lives: [
      { n: 1, label: 'Original purchase', detail: 'Bought new', value: 69, date: '2019' },
      { n: 2, label: 'RE:PLAY resale', detail: 'Bought by you on RE:PLAY', value: 14, date: 'Jul 2026' },
    ],
  },
  {
    id: 'RPL-66310', name: 'Chalk Crew Sweatshirt', brand: 'THREADLAB', img: IMG.whiteSweat,
    lives: [
      { n: 1, label: 'Original purchase', detail: 'First owner — THREADLAB retail', value: 59, date: 'Nov 2025' },
      { n: 2, label: 'RE:PLAY purchase', detail: 'Bought pre-owned by you on RE:PLAY', value: 12, date: 'Aug 2026' },
    ],
  },
]

export interface PortfolioItem extends GarmentAttrs {
  id: string
  name: string
  brand: string
  img: string
  category: Category
  bought: number
  current: number
  resale: number
  transform: number
  material: number
  guaranteed: number
  lifeScore: number
  passportId: string
  status: 'owned' | 'transforming' | 'transformed' | 'sold' | 'returned'
  acquiredVia: string
  transformedInto?: string
  /** Marketplace listing this was bought from */
  sourceProductId?: string
  /** This item's share of its order's Singapore Local Delivery fee */
  shipping?: number
  fabric?: Material
  condition?: number
  conditionLabel?: string
  /** Set once transformed — the new product is drawn instead of the original photo */
  mock?: MockSpec
}

// Nike Jacket values come from calculateCircularValue({ originalPrice: 90, category: 'jacket', material: 'nylon', brand: 'Nike', condition: 0.55, demand: 0.4, age: 0.7 })
export const SEED_PORTFOLIO: PortfolioItem[] = [
  { id: 'i-nike', name: 'Nike Jacket', brand: 'Nike', img: IMG.bomberJacket, category: 'jacket', bought: 18, current: 26, resale: 26, transform: 43, material: 5, guaranteed: 12, lifeScore: 2, passportId: 'RPL-73318', status: 'owned', acquiredVia: 'RE:PLAY resale', fabric: 'nylon', garment: 'nylon bomber jacket', colourName: 'Rust', colourHex: '#b5613a', size: 'L', pattern: 'Solid', style: 'Streetwear', condition: 0.55, conditionLabel: 'Pre-owned — good' },
  { id: 'i-jeans', name: 'Vintage 501 Jeans', brand: "Levi's", img: IMG.rippedJeans, category: 'denim', bought: 14, current: 22, resale: 22, transform: 48, material: 11, guaranteed: 9, lifeScore: 2, passportId: 'RPL-51207', status: 'owned', acquiredVia: 'RE:PLAY resale', fabric: 'denim', garment: 'vintage 501 jeans', colourName: 'Mid-wash blue', colourHex: '#6f93bd', size: '32/32', pattern: 'Distressed', style: 'Streetwear', condition: 0.7, conditionLabel: 'Pre-owned — distressed' },
  { id: 'i-sweat', name: 'Chalk Crew Sweatshirt', brand: 'THREADLAB', img: IMG.whiteSweat, category: 'hoodie', bought: 12, current: 19, resale: 19, transform: 31, material: 6, guaranteed: 8, lifeScore: 2, passportId: 'RPL-66310', status: 'owned', acquiredVia: 'RE:PLAY marketplace', fabric: 'cotton', garment: 'crew sweatshirt', colourName: 'Chalk white', colourHex: '#ecebe6', size: 'M', pattern: 'Solid', style: 'Minimal', condition: 0.85, conditionLabel: 'Pre-owned — like new' },
]

/* ------------------------------------------------------------------ */

export interface WalletTx {
  id: string
  label: string
  detail: string
  amount: number
  /** 'drop' and 'challenge' come from removed features but may still appear in saved wallets. */
  kind: 'return' | 'resale' | 'creator' | 'drop' | 'purchase' | 'withdraw' | 'challenge' | 'topup' | 'transform'
  date: string
}

export const SEED_WALLET: WalletTx[] = [
  { id: 't5', label: 'Purchase', detail: 'Chalk Crew Sweatshirt — S$12 + S$2.99 Singapore Local Delivery', amount: -14.99, kind: 'purchase', date: '2026-09-19T10:12:00' },
  { id: 't4', label: 'Creator reward', detail: 'Your jeans became 2 tote bags — Maya Studio', amount: 7.3, kind: 'creator', date: '2026-09-16T15:40:00' },
  { id: 't3', label: 'Resale', detail: 'Uniqlo fleece sold to @jun.lim', amount: 12.5, kind: 'resale', date: '2026-09-11T19:05:00' },
  { id: 't2', label: 'Return', detail: 'THREADLAB cardigan returned for RE:PLAY Cash', amount: 18, kind: 'return', date: '2026-09-04T12:30:00' },
  { id: 't1', label: 'Resale', detail: 'Vintage band tee sold to @mei.tan', amount: 20.5, kind: 'resale', date: '2026-08-28T09:14:00' },
]

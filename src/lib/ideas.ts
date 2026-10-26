/**
 * RE:PLAY Transformation Ideas — prototype recommendation engine.
 *
 * Given a second-hand garment and optional user filters, returns exactly three
 * transformation ideas. Deterministic: the same garment + filters + refresh
 * count always produce the same ideas, so the demo is repeatable offline.
 */
import type { Shape, MockSpec } from './mock'
import { DELIVERY_FEE } from './orders'
import type { Category, Material } from './engine'

export type ProductType = 'Bag' | 'Skirt' | 'Top' | 'Jacket' | 'Dress' | 'Accessories' | 'Home / Lifestyle' | 'Other'
export type Style = 'Minimal' | 'Streetwear' | 'Vintage' | 'Y2K' | 'Elegant' | 'Casual' | 'Cute' | 'Functional'
export type Difficulty = 'Easy' | 'Medium' | 'Advanced'
export type Budget = 'any' | 'u5' | '5-10' | '10-20' | '20+'
export type Preference = 'quick' | 'profit' | 'easy' | 'unique' | 'practical'

export const PRODUCT_TYPES: ProductType[] = ['Bag', 'Skirt', 'Top', 'Jacket', 'Dress', 'Accessories', 'Home / Lifestyle', 'Other']
export const STYLES: Style[] = ['Minimal', 'Streetwear', 'Vintage', 'Y2K', 'Elegant', 'Casual', 'Cute', 'Functional']
export const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Advanced']
export const BUDGETS: { id: Budget; label: string }[] = [
  { id: 'any', label: 'Any' },
  { id: 'u5', label: 'Under S$5' },
  { id: '5-10', label: 'S$5–S$10' },
  { id: '10-20', label: 'S$10–S$20' },
  { id: '20+', label: 'S$20+' },
]
export const PROFITS = [0, 10, 20, 30] as const
export const PREFERENCES: { id: Preference; label: string }[] = [
  { id: 'quick', label: 'I want something I can sell quickly' },
  { id: 'profit', label: 'I want maximum profit' },
  { id: 'easy', label: 'I want something easy to make' },
  { id: 'unique', label: 'I want something unique' },
  { id: 'practical', label: 'I want something practical' },
]

export interface Filters {
  types: ProductType[]
  styles: Style[]
  difficulties: Difficulty[]
  budget: Budget
  minProfit: number
  preference: Preference | null
}

export const EMPTY_FILTERS: Filters = { types: [], styles: [], difficulties: [], budget: 'any', minProfit: 0, preference: null }

export function activeFilterCount(f: Filters) {
  return f.types.length + f.styles.length + f.difficulties.length + (f.budget !== 'any' ? 1 : 0) + (f.minProfit > 0 ? 1 : 0) + (f.preference ? 1 : 0)
}

/* ------------------------------------------------------------------ */
/* Source garment profile                                              */
/* ------------------------------------------------------------------ */

export interface GarmentProfile {
  name: string
  brand: string
  category: Category
  material: Material
  garment: string
  colourName: string
  colourHex: string
  size: string
  pattern: string
  style: string
  condition: number
  conditionLabel: string
  /** Price paid for the item itself */
  itemCost: number
  /** Shipping paid to receive it */
  shippingIn: number
  /** Item + inbound shipping */
  acquisition: number
  /** AI "transformation potential" from the Circular Value Engine — anchors pricing */
  transformValue: number
}

const MATERIAL_DEFAULT_COLOUR: Record<Material, [string, string]> = {
  denim: ['Light-wash blue', '#8fb3d6'],
  cotton: ['Off-white', '#ebe9e3'],
  polyester: ['Rust', '#b5613a'],
  leather: ['Black', '#2a2524'],
  wool: ['Oatmeal', '#d8c9ad'],
  nylon: ['Navy', '#34435c'],
  blend: ['Stone grey', '#9aa09c'],
}

const CATEGORY_GARMENT: Record<Category, string> = {
  shirt: 'shirt',
  hoodie: 'hoodie',
  jacket: 'jacket',
  denim: 'jeans',
  sneaker: 'sneakers',
  bag: 'bag',
  knitwear: 'sweater',
  trousers: 'trousers',
  dress: 'dress',
  skirt: 'skirt',
}

export interface ProfileSource {
  name: string
  brand: string
  category: Category
  bought: number
  shipping?: number
  transform: number
  fabric?: Material
  garment?: string
  colourName?: string
  colourHex?: string
  size?: string
  pattern?: string
  style?: string
  condition?: number
  conditionLabel?: string
}

export function profileOf(item: ProfileSource): GarmentProfile {
  const material: Material = item.fabric ?? (item.category === 'denim' ? 'denim' : item.category === 'sneaker' ? 'blend' : 'cotton')
  const [cn, ch] = MATERIAL_DEFAULT_COLOUR[material]
  return {
    name: item.name,
    brand: item.brand,
    category: item.category,
    material,
    garment: item.garment ?? CATEGORY_GARMENT[item.category],
    colourName: item.colourName ?? cn,
    colourHex: item.colourHex ?? ch,
    size: item.size ?? 'M',
    pattern: item.pattern ?? 'Solid',
    style: item.style ?? 'Casual',
    condition: item.condition ?? 0.8,
    conditionLabel: item.conditionLabel ?? 'Pre-owned — good',
    itemCost: item.bought,
    shippingIn: item.shipping ?? 0,
    acquisition: item.bought + (item.shipping ?? 0),
    transformValue: item.transform,
  }
}

/** The source garment drawn as a mock, used if its photo can't load. */
export function garmentMock(p: GarmentProfile): MockSpec {
  const shape: Shape =
    p.category === 'jacket' ? 'jacket' : p.category === 'denim' || p.category === 'trousers' ? 'jeans' : p.category === 'hoodie' || p.category === 'knitwear' ? 'hoodie' : p.category === 'sneaker' ? 'sneaker' : p.category === 'bag' ? 'crossbody' : p.category === 'dress' ? 'dress' : p.category === 'skirt' ? 'midiskirt' : 'tee'
  return { shape, material: p.material, colour: p.colourHex }
}

/* ------------------------------------------------------------------ */
/* Idea catalog                                                        */
/* ------------------------------------------------------------------ */

const FABRIC: Category[] = ['jacket', 'denim', 'shirt', 'hoodie', 'knitwear', 'trousers', 'dress', 'skirt']

interface IdeaDef {
  id: string
  /** `{M}` is replaced with the fabric word, e.g. "Denim" */
  title: string
  shape: Shape
  type: ProductType
  styles: Style[]
  difficulty: Difficulty
  cost: number
  /** Sale price for a garment whose transformation potential equals its category reference */
  base: number
  speed: number
  unique: number
  practical: number
  sources: Category[]
  materials?: Material[]
  patch?: boolean
  days: number
  maker: string
  /** `{garment}` `{material}` `{colour}` `{wear}` `{pattern}` placeholders */
  why: string
}

const IDEAS: IdeaDef[] = [
  { id: 'tote', title: '{M} Tote Bag', shape: 'tote', type: 'Bag', styles: ['Minimal', 'Casual', 'Functional'], difficulty: 'Easy', cost: 6, base: 32, speed: 5, unique: 2, practical: 5, sources: [...FABRIC, 'bag'], days: 3, maker: 'DIY kit', why: 'Your {garment} has a large, flat {material} surface and {wear} — ideal for a structured tote.' },
  { id: 'miniskirt', title: 'Patchwork Mini Skirt', shape: 'miniskirt', type: 'Skirt', styles: ['Y2K', 'Vintage', 'Streetwear'], difficulty: 'Medium', cost: 10, base: 42, speed: 4, unique: 4, practical: 2, sources: ['jacket', 'denim', 'shirt', 'trousers', 'dress'], patch: true, days: 5, maker: 'Maya Studio', why: 'Panels from the {garment} carry natural tonal variation — patchwork turns that into the design.' },
  { id: 'vest', title: 'Cropped {M} Vest', shape: 'vest', type: 'Top', styles: ['Streetwear', 'Vintage', 'Casual'], difficulty: 'Medium', cost: 8, base: 38, speed: 4, unique: 3, practical: 3, sources: ['jacket'], days: 4, maker: 'Maya Studio', why: 'The collar and front panels are intact, so removing the sleeves keeps the {garment}’s structure.' },
  { id: 'buckethat', title: '{M} Bucket Hat', shape: 'buckethat', type: 'Accessories', styles: ['Streetwear', 'Y2K', 'Casual'], difficulty: 'Medium', cost: 7, base: 30, speed: 5, unique: 3, practical: 3, sources: FABRIC, days: 3, maker: 'Studio Hollow', why: 'A hat needs little fabric — the {garment}’s back panel alone yields a full crown and brim.' },
  { id: 'corset', title: '{M} Corset Top', shape: 'corset', type: 'Top', styles: ['Elegant', 'Y2K', 'Vintage'], difficulty: 'Advanced', cost: 14, base: 58, speed: 3, unique: 5, practical: 1, sources: ['jacket', 'denim', 'shirt', 'dress'], materials: ['denim', 'cotton', 'leather', 'wool', 'polyester'], days: 7, maker: 'Maya Studio', why: 'Sturdy {material} holds boning well, and existing seams give ready-made shaping lines.' },
  { id: 'shoulder', title: '{M} Shoulder Bag', shape: 'shoulder', type: 'Bag', styles: ['Minimal', 'Elegant', 'Casual'], difficulty: 'Easy', cost: 7, base: 36, speed: 4, unique: 3, practical: 4, sources: FABRIC, days: 3, maker: 'ReThread SG', why: 'The curved back panel of your {garment} cuts cleanly into a half-moon bag with minimal waste.' },
  { id: 'sling', title: '{M} Phone Sling', shape: 'sling', type: 'Accessories', styles: ['Functional', 'Streetwear', 'Minimal'], difficulty: 'Easy', cost: 4, base: 22, speed: 5, unique: 2, practical: 5, sources: [...FABRIC, 'bag'], days: 2, maker: 'DIY kit', why: 'Offcuts are enough for a small-format sling — fast to make, and slings sell within days.' },
  { id: 'shorts', title: 'Patchwork Shorts', shape: 'shorts', type: 'Other', styles: ['Streetwear', 'Casual', 'Vintage'], difficulty: 'Medium', cost: 9, base: 34, speed: 3, unique: 4, practical: 3, sources: ['jacket', 'denim', 'trousers'], patch: true, days: 4, maker: 'Maya Studio', why: 'Worn areas get cut away; the strongest {material} panels are pieced into a patchwork pair.' },
  { id: 'sleeve', title: 'Padded Laptop Sleeve', shape: 'sleeve', type: 'Bag', styles: ['Functional', 'Minimal'], difficulty: 'Easy', cost: 9, base: 36, speed: 4, unique: 2, practical: 5, sources: ['jacket', 'denim', 'hoodie', 'knitwear'], days: 3, maker: 'ReThread SG', why: 'Dense {material} protects well, and the {garment} gives one panel big enough for a 14" sleeve.' },
  { id: 'pouch', title: '{M} Mini Pouch', shape: 'pouch', type: 'Bag', styles: ['Minimal', 'Functional', 'Cute'], difficulty: 'Easy', cost: 4, base: 18, speed: 5, unique: 2, practical: 5, sources: [...FABRIC, 'bag'], days: 2, maker: 'DIY kit', why: 'Uses the smallest clean panels — a zip pouch is the lowest-risk way to start.' },
  { id: 'croptop', title: 'Cropped {M} Top', shape: 'croptop', type: 'Top', styles: ['Y2K', 'Streetwear', 'Cute', 'Casual'], difficulty: 'Easy', cost: 5, base: 26, speed: 4, unique: 3, practical: 3, sources: ['shirt', 'hoodie', 'knitwear', 'dress'], days: 2, maker: 'DIY kit', why: 'The body of your {garment} is in {wear}; cropping and re-hemming modernises the fit.' },
  { id: 'scrunchie', title: 'Scrunchie Set ×3', shape: 'scrunchie', type: 'Accessories', styles: ['Cute', 'Y2K', 'Casual'], difficulty: 'Easy', cost: 2, base: 15, speed: 5, unique: 2, practical: 3, sources: FABRIC, days: 1, maker: 'DIY kit', why: 'Sleeves alone make three scrunchies — near-zero cost and a quick first sale.' },
  { id: 'cushion', title: '{M} Cushion Cover', shape: 'cushion', type: 'Home / Lifestyle', styles: ['Minimal', 'Vintage', 'Casual'], difficulty: 'Easy', cost: 6, base: 28, speed: 3, unique: 3, practical: 4, sources: FABRIC, days: 2, maker: 'DIY kit', why: 'The {colour} {material} works as a statement cushion; the back panel covers a 45 cm insert.' },
  { id: 'apron', title: '{M} Work Apron', shape: 'apron', type: 'Home / Lifestyle', styles: ['Functional', 'Minimal', 'Vintage'], difficulty: 'Medium', cost: 8, base: 38, speed: 3, unique: 3, practical: 5, sources: ['jacket', 'denim', 'trousers', 'shirt'], materials: ['denim', 'cotton', 'leather'], days: 4, maker: 'ReThread SG', why: 'Heavy {material} is a café and studio favourite — hard-wearing and easy to price well.' },
  { id: 'patchjacket', title: 'Patchwork Chore Jacket', shape: 'jacket', type: 'Jacket', styles: ['Vintage', 'Streetwear'], difficulty: 'Advanced', cost: 16, base: 60, speed: 3, unique: 5, practical: 3, sources: ['jacket', 'denim'], patch: true, days: 6, maker: 'Maya Studio', why: 'Combining your {garment} with contrast panels creates a one-off piece collectors pay up for.' },
  { id: 'dress', title: '{M} Pinafore Dress', shape: 'dress', type: 'Dress', styles: ['Vintage', 'Cute', 'Casual'], difficulty: 'Advanced', cost: 15, base: 54, speed: 3, unique: 4, practical: 3, sources: ['denim', 'jacket', 'trousers'], materials: ['denim', 'cotton', 'wool'], days: 6, maker: 'Maya Studio', why: 'Enough {material} for a bib-front pinafore, reusing the original hardware for the straps.' },
  { id: 'midiskirt', title: '{M} Midi Skirt', shape: 'midiskirt', type: 'Skirt', styles: ['Elegant', 'Minimal', 'Vintage'], difficulty: 'Medium', cost: 9, base: 40, speed: 3, unique: 3, practical: 3, sources: ['shirt', 'trousers', 'denim', 'knitwear', 'dress'], days: 4, maker: 'ReThread SG', why: 'The {garment} opens into long panels that fall well as a pleated midi.' },
  { id: 'crossbody', title: '{M} Crossbody Bag', shape: 'crossbody', type: 'Bag', styles: ['Streetwear', 'Functional', 'Minimal'], difficulty: 'Medium', cost: 8, base: 34, speed: 4, unique: 3, practical: 4, sources: [...FABRIC, 'bag'], days: 3, maker: 'ReThread SG', why: 'Pockets and hardware from the {garment} become the flap and clasp — details buyers notice.' },
  { id: 'bandana', title: 'Pet Bandana', shape: 'bandana', type: 'Other', styles: ['Cute', 'Casual'], difficulty: 'Easy', cost: 2, base: 14, speed: 5, unique: 2, practical: 3, sources: FABRIC, days: 1, maker: 'DIY kit', why: 'A single triangle of {material} — pet accessories are among the fastest-selling upcycles.' },
  { id: 'headband', title: 'Knotted Headband', shape: 'headband', type: 'Accessories', styles: ['Cute', 'Y2K', 'Vintage'], difficulty: 'Easy', cost: 2, base: 16, speed: 4, unique: 2, practical: 2, sources: ['shirt', 'hoodie', 'knitwear', 'denim', 'dress', 'skirt'], days: 1, maker: 'DIY kit', why: 'Soft {material} from the hem gathers into a knot without extra structure.' },
  { id: 'drawstring', title: '{M} Drawstring Bag', shape: 'drawstring', type: 'Bag', styles: ['Casual', 'Functional'], difficulty: 'Easy', cost: 5, base: 24, speed: 4, unique: 2, practical: 4, sources: FABRIC, days: 2, maker: 'DIY kit', why: 'A simple tube and channel — the {garment}’s original hem becomes the drawstring casing.' },
  { id: 'bucketbag', title: '{M} Bucket Bag', shape: 'bucketbag', type: 'Bag', styles: ['Elegant', 'Vintage', 'Minimal'], difficulty: 'Medium', cost: 9, base: 44, speed: 3, unique: 4, practical: 3, sources: ['jacket', 'denim', 'knitwear', 'trousers', 'skirt'], days: 4, maker: 'Maya Studio', why: 'The {pattern} {material} keeps its character when shaped into a round-base bucket bag.' },
  { id: 'shirtdress', title: 'Shirt Dress Rework', shape: 'dress', type: 'Dress', styles: ['Elegant', 'Minimal', 'Casual'], difficulty: 'Medium', cost: 10, base: 46, speed: 3, unique: 4, practical: 3, sources: ['shirt'], days: 4, maker: 'ReThread SG', why: 'A roomy {garment} has the length to become a belted shirt dress with the original buttons.' },
  { id: 'coasters', title: '{M} Coaster Set', shape: 'coasters', type: 'Home / Lifestyle', styles: ['Minimal', 'Functional'], difficulty: 'Easy', cost: 3, base: 18, speed: 4, unique: 2, practical: 4, sources: [...FABRIC, 'bag', 'sneaker'], days: 1, maker: 'DIY kit', why: 'Scraps too small for anything else become a set of four — nothing goes to waste.' },
  { id: 'keychain', title: 'Offcut Keyring', shape: 'keychain', type: 'Accessories', styles: ['Cute', 'Streetwear', 'Functional'], difficulty: 'Easy', cost: 1, base: 10, speed: 5, unique: 2, practical: 3, sources: [...FABRIC, 'bag', 'sneaker'], days: 1, maker: 'DIY kit', why: 'The branded label and a strip of {material} make a keyring that carries the original story.' },
  { id: 'wallet', title: '{M} Card Wallet', shape: 'wallet', type: 'Accessories', styles: ['Minimal', 'Functional', 'Elegant'], difficulty: 'Medium', cost: 4, base: 26, speed: 4, unique: 3, practical: 5, sources: ['bag', 'jacket'], materials: ['leather', 'nylon', 'polyester', 'denim'], days: 2, maker: 'ReThread SG', why: 'Firm {material} panels hold card slots well — a compact, high-margin product.' },
  { id: 'repaint', title: 'Custom Hand-painted Pair', shape: 'repaint', type: 'Other', styles: ['Streetwear', 'Y2K', 'Cute'], difficulty: 'Medium', cost: 12, base: 60, speed: 4, unique: 5, practical: 3, sources: ['sneaker'], days: 4, maker: 'Studio Hollow', why: 'The uppers are in {wear}; a custom paint job resets them as one-of-one wearables.' },
  { id: 'planter', title: 'Shoe Planter', shape: 'planter', type: 'Home / Lifestyle', styles: ['Cute', 'Vintage'], difficulty: 'Easy', cost: 4, base: 24, speed: 3, unique: 4, practical: 2, sources: ['sneaker'], days: 1, maker: 'DIY kit', why: 'Worn soles don’t matter here — the silhouette becomes a desk planter people gift.' },
  { id: 'shadowbox', title: 'Shoe Shadow-box Art', shape: 'shadowbox', type: 'Home / Lifestyle', styles: ['Streetwear', 'Minimal'], difficulty: 'Medium', cost: 12, base: 48, speed: 2, unique: 5, practical: 1, sources: ['sneaker'], days: 3, maker: 'Studio Hollow', why: 'A recognisable silhouette framed as wall art — collectors value display pieces.' },
  { id: 'lanyard', title: 'Lace & Strap Lanyard', shape: 'lanyard', type: 'Accessories', styles: ['Functional', 'Streetwear'], difficulty: 'Easy', cost: 2, base: 14, speed: 4, unique: 2, practical: 4, sources: ['sneaker', 'bag'], days: 1, maker: 'DIY kit', why: 'Laces and webbing are still strong — braided into a lanyard they sell in bundles.' },
]

/** Default (unfiltered) ordering per source. The first three form the opening set. */
const ORDER: Record<string, string[]> = {
  'jacket:denim': ['tote', 'miniskirt', 'vest', 'buckethat', 'corset', 'shoulder', 'sling', 'shorts', 'sleeve', 'patchjacket', 'apron', 'bucketbag', 'crossbody', 'cushion', 'pouch'],
  jacket: ['vest', 'crossbody', 'sleeve', 'buckethat', 'shoulder', 'tote', 'sling', 'pouch', 'wallet', 'scrunchie'],
  denim: ['tote', 'miniskirt', 'shorts', 'buckethat', 'bucketbag', 'apron', 'dress', 'sling', 'patchjacket', 'corset'],
  shirt: ['croptop', 'tote', 'scrunchie', 'midiskirt', 'shirtdress', 'headband', 'pouch', 'cushion', 'corset'],
  hoodie: ['croptop', 'sleeve', 'buckethat', 'cushion', 'scrunchie', 'tote', 'pouch', 'bandana'],
  knitwear: ['cushion', 'croptop', 'bucketbag', 'sleeve', 'headband', 'scrunchie', 'midiskirt'],
  trousers: ['shorts', 'midiskirt', 'apron', 'tote', 'bucketbag', 'dress'],
  bag: ['crossbody', 'pouch', 'sling', 'wallet', 'keychain', 'coasters', 'tote', 'lanyard'],
  dress: ['croptop', 'miniskirt', 'corset', 'midiskirt', 'scrunchie', 'tote', 'headband', 'cushion', 'pouch'],
  skirt: ['tote', 'pouch', 'bucketbag', 'scrunchie', 'headband', 'buckethat', 'cushion', 'drawstring', 'bandana'],
  sneaker: ['repaint', 'planter', 'shadowbox', 'keychain', 'coasters', 'lanyard'],
}

/** Price anchor: the sale price the category's hero idea would reach at reference quality. */
const REF: Record<Category, number> = { jacket: 42, denim: 42, shirt: 30, hoodie: 32, knitwear: 32, trousers: 36, bag: 30, sneaker: 40, dress: 40, skirt: 30 }

const MATERIAL_WORD: Record<Material, string> = { denim: 'Denim', cotton: 'Cotton', polyester: 'Satin', leather: 'Leather', wool: 'Wool', nylon: 'Nylon', blend: 'Mixed' }
const MATERIAL_PREMIUM: Record<Material, number> = { denim: 1, cotton: 1, polyester: 0.95, leather: 1.3, wool: 1.1, nylon: 0.95, blend: 0.95 }

export interface Idea {
  id: string
  title: string
  type: ProductType
  styles: Style[]
  style: Style
  difficulty: Difficulty
  sale: number
  cost: number
  /** Shipping the finished product to its buyer */
  shippingOut: number
  investment: number
  profit: number
  days: number
  maker: string
  why: string
  mock: MockSpec
  /** Filters this idea does not satisfy (empty = exact match) */
  misses: string[]
}

function wearPhrase(c: number) {
  return c >= 0.85 ? 'minimal wear' : c >= 0.7 ? 'light wear' : 'some visible wear'
}

function build(def: IdeaDef, p: GarmentProfile, styleHint: Style[]): Idea {
  const factor = Math.min(1.8, Math.max(0.6, p.transformValue / REF[p.category]))
  const quality = Math.min(1, 0.85 + 0.2 * p.condition)
  const sale = Math.round(def.base * factor * quality * MATERIAL_PREMIUM[p.material])
  const investment = p.acquisition + def.cost + DELIVERY_FEE
  const fill = (s: string) =>
    s
      .replace(/\{M\}/g, MATERIAL_WORD[p.material])
      .replace(/\{garment\}/g, p.garment)
      .replace(/\{material\}/g, p.material)
      .replace(/\{colour\}/g, p.colourName.toLowerCase())
      .replace(/\{wear\}/g, wearPhrase(p.condition))
      .replace(/\{pattern\}/g, p.pattern.toLowerCase())
  const why = fill(def.why)
  return {
    id: def.id,
    title: fill(def.title),
    type: def.type,
    styles: def.styles,
    style: def.styles.find((s) => styleHint.includes(s)) ?? def.styles[0],
    difficulty: def.difficulty,
    sale,
    cost: def.cost,
    shippingOut: DELIVERY_FEE,
    investment,
    profit: Math.round((sale - investment) * 100) / 100,
    days: def.days,
    maker: def.maker,
    why: why.charAt(0).toUpperCase() + why.slice(1),
    mock: { shape: def.shape, material: p.material, colour: p.colourHex, patch: def.patch },
    misses: [],
  }
}

function candidates(p: GarmentProfile): IdeaDef[] {
  const fits = IDEAS.filter((d) => d.sources.includes(p.category) && (!d.materials || d.materials.includes(p.material)))
  const order = ORDER[`${p.category}:${p.material}`] ?? ORDER[p.category] ?? []
  const rank = (id: string) => {
    const i = order.indexOf(id)
    return i === -1 ? order.length + IDEAS.findIndex((d) => d.id === id) : i
  }
  return fits.sort((a, b) => rank(a.id) - rank(b.id))
}

const DIFF_RANK: Record<Difficulty, number> = { Easy: 0, Medium: 1, Advanced: 2 }

function inBudget(cost: number, b: Budget) {
  switch (b) {
    case 'u5':
      return cost < 5
    case '5-10':
      return cost >= 5 && cost <= 10
    case '10-20':
      return cost > 10 && cost <= 20
    case '20+':
      return cost > 20
    default:
      return true
  }
}

type FilterKey = 'types' | 'styles' | 'difficulties' | 'budget' | 'minProfit'

/** How much a miss matters when ranking closest alternatives. Product type is what users care about most. */
const MISS_WEIGHT: Record<FilterKey, number> = { types: 100, difficulties: 10, budget: 10, minProfit: 10, styles: 5 }

const money = (n: number) => `${n < 0 ? '−' : ''}S$${Math.abs(n).toFixed(Number.isInteger(n) ? 0 : 2)}`

/** Which of the user's filters an idea fails, with a short human label for each. */
function missesOf(i: Idea, f: Filters): { key: FilterKey; label: string }[] {
  const out: { key: FilterKey; label: string }[] = []
  if (f.types.length && !f.types.includes(i.type)) out.push({ key: 'types', label: `${i.type}, not ${f.types.join(' / ')}` })
  if (f.difficulties.length && !f.difficulties.includes(i.difficulty)) out.push({ key: 'difficulties', label: `${i.difficulty} difficulty` })
  if (!inBudget(i.cost, f.budget)) out.push({ key: 'budget', label: `${money(i.cost)} to make` })
  if (f.minProfit > 0 && i.profit < f.minProfit) out.push({ key: 'minProfit', label: `${money(i.profit)} profit` })
  if (f.styles.length && !i.styles.some((s) => f.styles.includes(s))) out.push({ key: 'styles', label: `Not ${f.styles.join(' / ')}` })
  return out
}

function prefSort(list: Idea[], pref: Preference | null, defs: Map<string, IdeaDef>) {
  if (!pref) return list
  const key = (i: Idea) => {
    const d = defs.get(i.id)!
    switch (pref) {
      case 'quick':
        return -d.speed
      case 'profit':
        return -i.profit
      case 'easy':
        return DIFF_RANK[i.difficulty] * 100 + i.cost
      case 'unique':
        return -d.unique
      case 'practical':
        return -d.practical
    }
  }
  // Stable sort keeps the AI's default order as the tie-breaker.
  return list.map((i, idx) => ({ i, idx })).sort((a, b) => key(a.i) - key(b.i) || a.idx - b.idx).map((x) => x.i)
}

export interface IdeaSet {
  ideas: Idea[]
  /** Ideas for this garment that satisfy every filter */
  exact: number
  /** All ideas that fit this garment, before filters */
  total: number
  /** Which set of three this is (0-based), for display */
  round: number
  rounds: number
}

/**
 * Returns exactly three ideas for the garment, filters and refresh round.
 *
 * Ideas matching every filter always come first. Only when fewer than three
 * match are the remaining slots filled with the closest alternatives — ranked
 * so the requested product type is kept wherever possible — and each one
 * carries `misses` describing what it doesn't satisfy.
 */
export function recommend(p: GarmentProfile, f: Filters, round: number): IdeaSet {
  const defs = candidates(p)
  const byId = new Map(defs.map((d) => [d.id, d]))
  const all = defs.map((d) => build(d, p, f.styles))

  const scored = all.map((i) => {
    const m = missesOf(i, f)
    return { idea: { ...i, misses: m.map((x) => x.label) }, weight: m.reduce((s, x) => s + MISS_WEIGHT[x.key], 0) }
  })
  const exact = prefSort(
    scored.filter((x) => x.weight === 0).map((x) => x.idea),
    f.preference,
    byId,
  )

  if (exact.length >= 3) {
    const rounds = Math.ceil(exact.length / 3)
    const r = round % rounds
    const page = [0, 1, 2].map((k) => exact[(r * 3 + k) % exact.length])
    // Last page wraps; keep all three distinct.
    const ideas = page.map((i, k) => (page.findIndex((x) => x.id === i.id) === k ? i : exact.find((x) => !page.some((y) => y.id === x.id)) ?? i))
    return { ideas, exact: exact.length, total: all.length, round: r, rounds }
  }

  // Keep every exact match on screen; page through the closest alternatives for the remaining slots.
  const altOrder = prefSort(
    scored.filter((x) => x.weight > 0).map((x) => x.idea),
    f.preference,
    byId,
  )
  const weightOf = new Map(scored.map((x) => [x.idea.id, x.weight]))
  const alts = altOrder.map((i, idx) => ({ i, idx })).sort((a, b) => weightOf.get(a.i.id)! - weightOf.get(b.i.id)! || a.idx - b.idx).map((x) => x.i)
  const slots = 3 - exact.length
  const rounds = Math.max(1, Math.ceil(alts.length / slots))
  const r = round % rounds
  const fill = Array.from({ length: slots }, (_, k) => alts[(r * slots + k) % alts.length])
  const seen = new Set(exact.map((i) => i.id))
  const distinct = fill.map((i) => {
    if (!seen.has(i.id)) {
      seen.add(i.id)
      return i
    }
    const alt = alts.find((x) => !seen.has(x.id)) ?? i
    seen.add(alt.id)
    return alt
  })
  return { ideas: [...exact, ...distinct], exact: exact.length, total: all.length, round: r, rounds }
}

/** Every idea this garment can realistically become (the catalog filtered by source and material). */
export function allIdeas(p: GarmentProfile, styleHint: Style[] = []): Idea[] {
  return candidates(p).map((d) => build(d, p, styleHint))
}

export interface OptionCounts {
  types: Record<string, number>
  styles: Record<string, number>
  difficulties: Record<string, number>
  budget: Record<Budget, number>
  minProfit: Record<number, number>
}

/** How many ideas exist for this garment under each individual filter option. */
export function optionCounts(p: GarmentProfile): OptionCounts {
  const all = candidates(p).map((d) => build(d, p, []))
  const count = (pred: (i: Idea) => boolean) => all.filter(pred).length
  return {
    types: Object.fromEntries(PRODUCT_TYPES.map((t) => [t, count((i) => i.type === t)])),
    styles: Object.fromEntries(STYLES.map((s) => [s, count((i) => i.styles.includes(s))])),
    difficulties: Object.fromEntries(DIFFICULTIES.map((d) => [d, count((i) => i.difficulty === d)])),
    budget: Object.fromEntries(BUDGETS.map((b) => [b.id, count((i) => inBudget(i.cost, b.id))])) as Record<Budget, number>,
    minProfit: Object.fromEntries(PROFITS.map((v) => [v, count((i) => v === 0 || i.profit >= v)])),
  }
}

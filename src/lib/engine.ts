/**
 * RE:PLAY Circular Value Engine — prototype simulation.
 *
 * Deterministic valuation model. No ML, no randomness: the same inputs always
 * produce the same outputs, so the demo is repeatable. The coefficients are
 * hand-tuned approximations of secondary-market behaviour for apparel.
 */

export type Category = 'shirt' | 'hoodie' | 'jacket' | 'denim' | 'sneaker' | 'bag' | 'knitwear' | 'trousers' | 'dress' | 'skirt'
export type Material = 'cotton' | 'denim' | 'polyester' | 'leather' | 'wool' | 'nylon' | 'blend'
export type Channel = 'premium_resale' | 'value_drop' | 'creator_transformation' | 'material_recovery'

export interface ProductInput {
  originalPrice: number
  /** 0–1, 1 = new with tags */
  condition: number
  category: Category
  brand?: string
  /** 0–1, current market demand signal */
  demand: number
  material: Material
  /** 0–1, 0 = current season, 1 = 3+ seasons old */
  age: number
  inventoryQuantity?: number
}

export interface CircularValue {
  resaleValue: number
  transformationValue: number
  materialValue: number
  liquidationValue: number
  recommendedChannel: Channel
  estimatedRecovery: number
  /** % uplift of best channel over liquidation */
  valueUplift: number
  /** How many more economic lives the product can realistically have (1–4) */
  lifePotential: number
}

/** Share of original price a category typically holds on resale markets. */
const RESALE_RETENTION: Record<Category, number> = {
  shirt: 0.63,
  hoodie: 0.66,
  jacket: 0.7,
  denim: 0.68,
  sneaker: 0.74,
  bag: 0.78,
  knitwear: 0.58,
  trousers: 0.55,
  dress: 0.6,
  skirt: 0.56,
}

/** How much value a skilled creator can add relative to original price. */
const TRANSFORM_POTENTIAL: Record<Category, number> = {
  shirt: 0.7,
  hoodie: 0.66,
  jacket: 0.72,
  denim: 0.8,
  sneaker: 0.52,
  bag: 0.6,
  knitwear: 0.64,
  trousers: 0.62,
  dress: 0.7,
  skirt: 0.64,
}

/** Workability of a material for upcycling. */
const MATERIAL_WORKABILITY: Record<Material, number> = {
  cotton: 1.0,
  denim: 1.12,
  polyester: 0.82,
  leather: 1.08,
  wool: 1.02,
  nylon: 0.8,
  blend: 0.86,
}

/** Recoverable fibre/material value as a share of original price. */
const MATERIAL_RECOVERY: Record<Material, number> = {
  cotton: 0.15,
  denim: 0.14,
  polyester: 0.07,
  leather: 0.12,
  wool: 0.18,
  nylon: 0.06,
  blend: 0.08,
}

/** Brand heat multiplier on resale (fictional partner brands + common resale brands). */
const BRAND_PREMIUM: Record<string, number> = {
  NOVAWEAR: 1.0,
  LOOPFORM: 1.04,
  THREADLAB: 0.96,
  'URBAN/01': 1.08,
  Nike: 1.18,
  "Levi's": 1.12,
  Adidas: 1.1,
  Uniqlo: 0.9,
  Puma: 1.05,
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
const round = (v: number) => Math.round(v)
const roundTo = (v: number, step: number) => Number((Math.round(v / step) * step).toFixed(2))

function brandPremium(brand?: string) {
  return (brand && BRAND_PREMIUM[brand]) || 1
}

/** Unrounded per-unit values — used internally so bulk maths doesn't compound rounding. */
function rawValues(p: ProductInput) {
  const condition = clamp(p.condition)
  const demand = clamp(p.demand)
  const age = clamp(p.age)
  const bp = brandPremium(p.brand)

  const resale =
    p.originalPrice * RESALE_RETENTION[p.category] * condition * (0.6 + 0.6 * demand) * (1 - 0.35 * age) * bp

  const transformation =
    p.originalPrice *
    TRANSFORM_POTENTIAL[p.category] *
    (0.7 + 0.3 * condition) *
    MATERIAL_WORKABILITY[p.material] *
    (0.8 + 0.4 * demand)

  const material = p.originalPrice * MATERIAL_RECOVERY[p.material] * (0.7 + 0.3 * condition)

  const liquidation = p.originalPrice * 0.2 * (0.8 + 0.2 * condition)

  return { resale, transformation, material, liquidation }
}

export function calculateCircularValue(p: ProductInput): CircularValue {
  const raw = rawValues(p)
  const options: [Channel, number][] = [
    ['premium_resale', raw.resale],
    ['creator_transformation', raw.transformation],
    ['material_recovery', raw.material],
  ]
  const [recommendedChannel, best] = options.reduce((a, b) => (b[1] > a[1] ? b : a))
  const lifePotential =
    1 + (raw.resale > raw.liquidation ? 1 : 0) + (raw.transformation > raw.resale * 0.9 ? 1 : 0) + (raw.material > 1 ? 1 : 0)

  return {
    resaleValue: round(raw.resale),
    transformationValue: round(raw.transformation),
    materialValue: round(raw.material),
    liquidationValue: round(raw.liquidation),
    recommendedChannel,
    estimatedRecovery: round(best),
    // Uplift is quoted on the rounded dollar figures the user actually sees.
    valueUplift: Math.floor(((round(best) - round(raw.liquidation)) / round(raw.liquidation)) * 100),
    lifePotential: Math.min(4, lifePotential),
  }
}

/* ------------------------------------------------------------------ */
/* Bulk allocation — the "Value Map"                                   */
/* ------------------------------------------------------------------ */

export interface ChannelAllocation {
  channel: Channel
  label: string
  units: number
  perUnit: number
  revenue: number
  rationale: string
}

export interface ValueMap {
  input: ProductInput & { inventoryQuantity: number }
  unit: CircularValue
  allocations: ChannelAllocation[]
  totalRecovery: number
  originalValue: number
  liquidationTotal: number
  difference: number
  recoveryRate: number
}

const CHANNEL_LABEL: Record<Channel, string> = {
  premium_resale: 'Premium resale',
  value_drop: 'Marketplace listings',
  creator_transformation: 'Creator transformation',
  material_recovery: 'Material recovery',
}

/**
 * Split a batch across channels. Each channel has limited market absorption,
 * so the engine doesn't push everything into the highest per-unit channel.
 *
 *  - Premium resale absorbs the best-condition units, limited by demand.
 *  - Marketplace listings absorb a demand-driven slice at second-hand pricing.
 *  - Material recovery takes the worn tail (scales with 1 - condition).
 *  - Creator transformation takes the remainder.
 *
 * Net per-unit revenue is what the brand keeps after platform/creator splits.
 */
export function allocateInventory(input: ProductInput & { inventoryQuantity: number }): ValueMap {
  const q = input.inventoryQuantity
  const raw = rawValues(input)
  const unit = calculateCircularValue(input)
  const condition = clamp(input.condition)
  const demand = clamp(input.demand)

  const premiumShare = roundTo(0.336 * demand * condition, 0.05)
  let dropShare = roundTo(0.2 + 0.15 * demand, 0.05)
  const materialShare = roundTo(Math.max(0.05, (1 - condition) * 0.8 + 0.08), 0.05)
  let creatorShare = 1 - premiumShare - dropShare - materialShare
  if (creatorShare < 0.05) {
    // Very worn stock: shrink listings first, then premium.
    const deficit = 0.05 - creatorShare
    dropShare = Math.max(0.05, dropShare - deficit)
    creatorShare = 1 - premiumShare - dropShare - materialShare
  }

  const perUnit = {
    premium_resale: roundTo(raw.resale * 0.9, 0.5), // 10% platform fee
    value_drop: roundTo(((raw.resale + raw.liquidation) / 2) * 0.92, 0.5), // discovery pricing, 8% fee
    creator_transformation: roundTo(raw.transformation * 0.52, 0.5), // brand's share: material sale + royalty
    material_recovery: roundTo(raw.material * 1.15, 0.5), // graded bulk fibre premium
  }

  const u = (share: number) => Math.round(q * share)
  const premiumUnits = u(premiumShare)
  const dropUnits = u(dropShare)
  const materialUnits = u(materialShare)
  const creatorUnits = q - premiumUnits - dropUnits - materialUnits

  const allocations: ChannelAllocation[] = [
    {
      channel: 'premium_resale',
      label: CHANNEL_LABEL.premium_resale,
      units: premiumUnits,
      perUnit: perUnit.premium_resale,
      revenue: premiumUnits * perUnit.premium_resale,
      rationale: `Top-grade units. Demand ${(demand * 100).toFixed(0)}% supports near-retail pricing for a limited slice.`,
    },
    {
      channel: 'value_drop',
      label: CHANNEL_LABEL.value_drop,
      units: dropUnits,
      perUnit: perUnit.value_drop,
      revenue: dropUnits * perUnit.value_drop,
      rationale: 'Mixed sizes and colourways sell fastest as individual pre-owned listings.',
    },
    {
      channel: 'creator_transformation',
      label: CHANNEL_LABEL.creator_transformation,
      units: creatorUnits,
      perUnit: perUnit.creator_transformation,
      revenue: creatorUnits * perUnit.creator_transformation,
      rationale: `${input.material} scores ${MATERIAL_WORKABILITY[input.material].toFixed(2)} workability — strong creator demand.`,
    },
    {
      channel: 'material_recovery',
      label: CHANNEL_LABEL.material_recovery,
      units: materialUnits,
      perUnit: perUnit.material_recovery,
      revenue: materialUnits * perUnit.material_recovery,
      rationale: 'Worn or defective tail routed to graded fibre recovery instead of landfill.',
    },
  ]

  const totalRecovery = allocations.reduce((s, a) => s + a.revenue, 0)
  const originalValue = q * input.originalPrice
  const liquidationTotal = q * roundTo(raw.liquidation * 0.75, 0.1) // bulk liquidators pay ~75% of unit liquidation
  return {
    input,
    unit,
    allocations,
    totalRecovery,
    originalValue,
    liquidationTotal,
    difference: totalRecovery - liquidationTotal,
    recoveryRate: totalRecovery / originalValue,
  }
}

/** Channel colours — validated categorical order (colour-blind safe on light surfaces). */
export const CHANNEL_COLORS = ['#7A52B3', '#C98FA0', '#6B7A4B', '#C4A15A']
export const CHANNEL_TEXT = ['#fff', '#29252B', '#fff', '#29252B']

/**
 * RE:PLAY Transform Studio — ALTER and UPCYCLE engine (prototype).
 *
 * ALTER   — "Make it fit me."     Change measurements of the existing garment. S$6 per alteration area.
 * UPCYCLE — "Give it a new life." Turn it into something new, built on the idea catalog in ./ideas.
 *
 * Everything here is deterministic and offline: garment measurements are estimated from the listing's
 * category and size, and feasibility is a rule-based AI *estimate* — never a professional tailoring assessment.
 */
import type { MockSpec, Shape } from '../components/ProductMock'
import { DELIVERY_FEE } from './data'
import type { Category } from './engine'
import type { FitProfile } from './fit'
import { allIdeas, type GarmentProfile, type Idea, type Style } from './ideas'

/* ------------------------------------------------------------------ */
/* Prices — kept separate from item prices and delivery on purpose     */
/* ------------------------------------------------------------------ */

/** ALTER is priced per alteration area. */
export const ALTER_FEE = 6
/** RE:PLAY+ subscription, per month. */
export const PLUS_PRICE = 9.9
export const PLUS_TAGLINE = 'Design it. See it. Make it.'

export const alterFee = (areas: number) => areas * ALTER_FEE

/* ------------------------------------------------------------------ */
/* Style profile (RE:PLAY+ personalisation)                            */
/* ------------------------------------------------------------------ */

export type FitPref = 'fitted' | 'relaxed' | 'oversized'
export const FIT_PREFS: { id: FitPref; label: string }[] = [
  { id: 'fitted', label: 'Fitted' },
  { id: 'relaxed', label: 'Relaxed' },
  { id: 'oversized', label: 'Oversized' },
]

export interface StyleProfile {
  styles: Style[]
  fit: FitPref
}

/** Starting point before the user tells us anything: their garment's own style. */
export function defaultStyleProfile(p: GarmentProfile): StyleProfile {
  const known: Style[] = ['Minimal', 'Streetwear', 'Vintage', 'Y2K', 'Elegant', 'Casual', 'Cute', 'Functional']
  const s = known.find((k) => k.toLowerCase() === p.style.toLowerCase())
  return { styles: s ? [s] : ['Casual'], fit: /oversized/i.test(p.size) ? 'oversized' : 'relaxed' }
}

/* ------------------------------------------------------------------ */
/* Garment measurements (estimated from category + size)               */
/* ------------------------------------------------------------------ */

export type GarmentKind = 'top' | 'outer' | 'bottom' | 'skirt' | 'dress' | 'none'
export type MeasureKey = 'length' | 'chest' | 'waist' | 'hips' | 'sleeve' | 'leg'

export const KIND_OF: Record<Category, GarmentKind> = {
  shirt: 'top',
  hoodie: 'top',
  knitwear: 'top',
  jacket: 'outer',
  denim: 'bottom',
  trousers: 'bottom',
  skirt: 'skirt',
  dress: 'dress',
  bag: 'none',
  sneaker: 'none',
}

export type GarmentMeasures = Partial<Record<MeasureKey, number>>

/** Size M reference measurements (cm). Circumferences are full round measurements, lengths are flat. */
const BASE: Record<Category, GarmentMeasures> = {
  shirt: { length: 74, chest: 106, waist: 100, sleeve: 62 },
  hoodie: { length: 68, chest: 112, waist: 106, sleeve: 63 },
  knitwear: { length: 66, chest: 108, waist: 100, sleeve: 60 },
  jacket: { length: 66, chest: 114, waist: 108, sleeve: 64 },
  denim: { length: 104, waist: 82, hips: 102, leg: 40 },
  trousers: { length: 102, waist: 80, hips: 102, leg: 42 },
  skirt: { length: 58, waist: 72, hips: 98 },
  dress: { length: 96, chest: 92, waist: 76, hips: 100 },
  bag: {},
  sneaker: {},
}

const LETTER = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

/** How many sizes above (or below) M the listing size is, plus any exact numbers it carries. */
function parseSize(size: string, category: Category): { step: number; waistIn?: number; inseamIn?: number; oversized: boolean } {
  const s = size.trim().toUpperCase()
  const oversized = /OVERSIZED/.test(s)
  const letter = s.match(/^(XXS|XS|S|M|L|XL|XXL|2XL|3XL)\b/)
  if (letter) {
    const k = letter[1] === '2XL' ? 'XXL' : letter[1] === '3XL' ? 'XXL' : letter[1] === 'XXS' ? 'XS' : letter[1]
    return { step: LETTER.indexOf(k) - 2, oversized }
  }
  const jeans = s.match(/^(\d{2})\s*\/\s*(\d{2})$/)
  if (jeans) return { step: 0, waistIn: Number(jeans[1]), inseamIn: Number(jeans[2]), oversized }
  const n = Number(s.replace(/[^\d.]/g, ''))
  if (!Number.isFinite(n) || n <= 0) return { step: 0, oversized }
  // Collar size in inches (shirts), chest in inches (tailored jackets, e.g. 40R), waist in inches (jeans).
  if (category === 'shirt' && n >= 13 && n <= 19) return { step: Math.round((n - 15.5) / 0.5), oversized }
  if (category === 'jacket' && n >= 34 && n <= 50) return { step: Math.round((n - 40) / 2), oversized }
  if ((category === 'denim' || category === 'trousers') && n >= 24 && n <= 44) return { step: 0, waistIn: n, oversized }
  return { step: 0, oversized }
}

const r1 = (n: number) => Math.round(n * 2) / 2

/** AI-estimated garment measurements from the listing's category and size label. */
export function garmentMeasures(p: GarmentProfile): GarmentMeasures {
  const base = BASE[p.category]
  const { step, waistIn, inseamIn, oversized } = parseSize(p.size, p.category)
  const st = Math.max(-2, Math.min(3, step))
  const out: GarmentMeasures = {}
  for (const k of Object.keys(base) as MeasureKey[]) {
    const v = base[k]!
    const circ = k === 'chest' || k === 'waist' || k === 'hips' || k === 'leg'
    out[k] = r1(v + st * (circ ? (k === 'leg' ? 1.5 : 5) : k === 'sleeve' ? 1 : 1.5))
  }
  if (oversized && out.chest) {
    out.chest = r1(out.chest + 10)
    if (out.waist) out.waist = r1(out.waist + 10)
    if (out.length) out.length = r1(out.length + 4)
  }
  if (waistIn) {
    out.waist = r1(waistIn * 2.54)
    if (out.hips) out.hips = r1(out.waist + 20)
  }
  if (inseamIn && out.length) out.length = r1(inseamIn * 2.54 + 26)
  return out
}

/** How the measurements were estimated — shown so the user knows to double-check. */
export const measuresNote = (p: GarmentProfile) =>
  KIND_OF[p.category] === 'none' ? '' : `AI estimate from size ${p.size} — the maker re-measures your garment before cutting.`

/* ------------------------------------------------------------------ */
/* ALTER                                                               */
/* ------------------------------------------------------------------ */

export type AreaId = 'length' | 'waist' | 'chest' | 'hips' | 'sleeve' | 'leg'
export type Direction = 'decrease' | 'increase'

export interface AreaDef {
  id: AreaId
  label: string
  short: string
  hint: string
}

const AREA_DEFS: Record<AreaId, Omit<AreaDef, 'id'>> = {
  length: { label: 'Overall length / hem', short: 'Length', hint: 'Shorten or let down the hem' },
  waist: { label: 'Waist', short: 'Waist', hint: 'Cinch in or let out at the waist' },
  chest: { label: 'Chest / bust', short: 'Chest', hint: 'Take in or let out through the body' },
  hips: { label: 'Hips', short: 'Hips', hint: 'Adjust the seat and hip line' },
  sleeve: { label: 'Sleeves', short: 'Sleeves', hint: 'Shorten or lengthen both sleeves' },
  leg: { label: 'Leg opening (taper)', short: 'Leg opening', hint: 'Taper or widen from knee to hem' },
}

const KIND_AREAS: Record<GarmentKind, AreaId[]> = {
  top: ['length', 'waist', 'chest', 'sleeve'],
  outer: ['length', 'waist', 'chest', 'sleeve'],
  bottom: ['length', 'waist', 'hips', 'leg'],
  skirt: ['length', 'waist', 'hips'],
  dress: ['length', 'waist', 'chest', 'hips'],
  none: [],
}

/** The alteration areas that make sense for this garment (empty for bags and shoes). */
export function alterAreas(p: GarmentProfile): AreaDef[] {
  const kind = KIND_OF[p.category]
  return KIND_AREAS[kind].map((id) => ({
    id,
    ...AREA_DEFS[id],
    ...(id === 'length' && kind === 'bottom' ? { label: 'Leg length / hem', hint: 'Shorten or let down both legs' } : {}),
  }))
}

export const canAlter = (p: GarmentProfile) => KIND_OF[p.category] !== 'none'

export interface AlterChange {
  area: AreaId
  dir: Direction
  /** cm, always positive — `dir` gives the sign */
  amount: number
}

export const signed = (c: AlterChange) => (c.dir === 'decrease' ? -c.amount : c.amount)
export const fmtCm = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(Math.round(n * 10) / 10)} cm`
export const changeLabel = (c: AlterChange) => `${AREA_DEFS[c.area].short}: ${fmtCm(signed(c))}`

/** Garment measurements after the requested changes. */
export function alteredMeasures(m: GarmentMeasures, changes: AlterChange[]): GarmentMeasures {
  const out = { ...m }
  for (const c of changes) {
    const v = out[c.area]
    if (v !== undefined) out[c.area] = r1(v + signed(c))
  }
  return out
}

/** Validates one amount the user typed. Returns an error message, or null. */
export function amountError(raw: string, area: AreaId, dir: Direction, m: GarmentMeasures): string | null {
  const t = raw.trim()
  if (!t) return 'Enter how many cm to change.'
  const n = Number(t)
  if (!Number.isFinite(n)) return 'Use numbers only, e.g. 3.'
  if (n <= 0) return 'Enter an amount above 0 cm.'
  if (n > 60) return 'That’s more than 60 cm — please check the amount.'
  const cur = m[area]
  if (dir === 'decrease' && cur !== undefined && n >= cur * 0.8) return `The garment is only about ${cur} cm here.`
  return null
}

/* ------------------------------------------------------------------ */
/* Feasibility (shared by ALTER and UPCYCLE)                           */
/* ------------------------------------------------------------------ */

export type Verdict = 'ok' | 'caution' | 'no'

export interface FeasibilityNote {
  verdict: Verdict
  text: string
}

export interface Feasibility {
  verdict: Verdict
  headline: string
  notes: FeasibilityNote[]
}

const RANK: Record<Verdict, number> = { ok: 0, caution: 1, no: 2 }
export const VERDICT_LABEL: Record<Verdict, string> = { ok: 'Likely feasible', caution: 'Feasible with limits', no: 'Not recommended' }

function summarise(notes: FeasibilityNote[], kind: 'alter' | 'upcycle'): Feasibility {
  const verdict = notes.reduce<Verdict>((w, n) => (RANK[n.verdict] > RANK[w] ? n.verdict : w), 'ok')
  const headline =
    verdict === 'ok'
      ? kind === 'alter'
        ? 'This alteration should be feasible.'
        : 'This transformation looks achievable from your garment.'
      : verdict === 'caution'
        ? kind === 'alter'
          ? 'This alteration may be limited by the original garment construction.'
          : 'Achievable, but some details depend on the original garment.'
        : kind === 'alter'
          ? 'This alteration is unlikely to be realistically achievable as requested.'
          : 'Your garment probably can’t supply this as specified.'
  return { verdict, headline, notes: notes.length ? notes : [{ verdict: 'ok', text: 'No construction limits found for these changes.' }] }
}

const RIB: Category[] = ['hoodie', 'knitwear']

/** AI feasibility estimate for an alteration. Not a professional tailoring assessment. */
export function alterFeasibility(p: GarmentProfile, m: GarmentMeasures, changes: AlterChange[], body: FitProfile | null): Feasibility {
  const notes: FeasibilityNote[] = []
  const add = (verdict: Verdict, text: string) => notes.push({ verdict, text })
  const kind = KIND_OF[p.category]
  const after = alteredMeasures(m, changes)

  for (const c of changes) {
    const cur = m[c.area] ?? 0
    const a = c.amount
    const name = AREA_DEFS[c.area].short.toLowerCase()
    if (c.dir === 'increase') {
      // Letting out relies on the seam / hem allowance the garment was sewn with.
      const [okMax, cautionMax] = c.area === 'length' ? [2, 4] : c.area === 'sleeve' ? [2, 3] : c.area === 'leg' ? [1.5, 3] : [2, 4]
      if (a <= okMax) add('ok', `Letting out the ${name} by ${a} cm fits within a typical ${c.area === 'length' ? 'hem' : 'seam'} allowance.`)
      else if (a <= cautionMax) add('caution', `Letting out the ${name} by ${a} cm uses most of the ${c.area === 'length' ? 'hem' : 'seam'} allowance — old stitch lines or a fade line may show.`)
      else add('no', `Adding ${a} cm to the ${name} needs more fabric than the seams hold. Try ${cautionMax} cm or less, or UPCYCLE it with added panels.`)
      if (c.area === 'length' && p.material === 'denim') add('caution', 'Denim keeps a visible fade line where the original hem was folded.')
    } else {
      if (c.area === 'length') {
        const pct = a / Math.max(1, cur)
        if (pct <= 0.25) add('ok', `Shortening by ${a} cm (to about ${r1(cur - a)} cm) is a standard re-hem.`)
        else if (pct <= 0.4) add('caution', `Removing ${a} cm changes the proportions noticeably${kind === 'bottom' ? '' : ' and may cut into pockets or button spacing'}.`)
        else add('no', `Taking ${a} cm off would remove ${Math.round(pct * 100)}% of the length — that’s a redesign. UPCYCLE may suit better.`)
      } else if (c.area === 'sleeve') {
        if (a <= 10) add('ok', `Shortening sleeves by ${a} cm is routine${p.category === 'shirt' || p.category === 'jacket' ? '; cuffs are removed and re-set' : ''}.`)
        else if (a <= cur * 0.5) add('caution', `Removing ${a} cm turns long sleeves into short ones — the cuff detail won’t carry over.`)
        else add('no', `Shortening by ${a} cm leaves too little sleeve to finish neatly.`)
      } else if (c.area === 'leg') {
        if (a <= 8) add('ok', `Tapering the leg opening by ${a} cm is a standard inseam taper.`)
        else if (a <= 14) add('caution', `A ${a} cm taper is strong — check it still fits over your foot.`)
        else add('no', `A ${a} cm taper is excessive for this leg.`)
      } else {
        if (a <= 6) add('ok', `Taking in the ${name} by ${a} cm can be done at the side seams${c.area === 'waist' ? ' or with darts' : ''}.`)
        else if (a <= 10) add('caution', `Taking in the ${name} by ${a} cm may affect pocket placement and overall proportions.`)
        else add('no', `Taking in the ${name} by ${a} cm is excessive — the garment would need re-cutting.`)
      }
    }
    // Construction details that limit specific areas.
    if (c.area === 'length' && RIB.includes(p.category)) add('caution', `The ribbed hem band of this ${p.garment} must be removed and re-attached.`)
    if (c.area === 'length' && kind === 'outer') add('caution', 'Jacket hems often carry a lining and hem band — allow extra making time.')
    if (c.area === 'chest' && kind === 'outer') add('caution', 'Jacket chests are structured; changes over 4 cm also involve the armholes.')
    if (c.area === 'waist' && kind === 'bottom' && c.dir === 'decrease' && a > 4) add('caution', 'Larger waist changes are taken at the centre-back seam and belt loops are moved.')
  }

  // Fit against the wearer's body (only if we know it).
  if (body) {
    const ease = (k: 'chest' | 'waist' | 'hips') => (after[k] ?? 0) - (k === 'chest' ? body.bust : body[k])
    const tight = (k: 'chest' | 'waist' | 'hips', label: string, min: number) => {
      if (after[k] === undefined || !changes.some((c) => c.area === k)) return
      const e = ease(k)
      if (e < 0) add('no', `The new ${label} (${after[k]} cm) would be smaller than the wearer’s ${label} (${k === 'chest' ? body.bust : body[k]} cm).`)
      else if (e < min) add('caution', `Only ${r1(e)} cm of ease left at the ${label} — a close fit.`)
    }
    tight('chest', 'chest', 4)
    tight('waist', 'waist', kind === 'bottom' || kind === 'skirt' ? 1 : 3)
    tight('hips', 'hips', 3)
  }

  if (p.material === 'leather' && changes.length) add('caution', 'Leather keeps needle holes — the first fitting has to be right.')
  if (p.condition < 0.6 && changes.length) add('caution', 'Visible wear — the maker will check seam strength before altering.')
  if (changes.length >= 4) add('caution', 'Four or more areas at once — the maker will confirm the overall balance first.')
  return summarise(notes, 'alter')
}

/* ------------------------------------------------------------------ */
/* UPCYCLE                                                             */
/* ------------------------------------------------------------------ */

/** What the target product is, for measurements and previews. */
export type TargetForm = 'top' | 'outer' | 'vest' | 'corset' | 'bottom' | 'shorts' | 'skirt' | 'dress' | 'apron' | 'bag' | 'item'

export const FORM_OF: Record<Shape, TargetForm> = {
  croptop: 'top',
  tee: 'top',
  hoodie: 'top',
  corset: 'corset',
  vest: 'vest',
  jacket: 'outer',
  miniskirt: 'skirt',
  midiskirt: 'skirt',
  shorts: 'shorts',
  jeans: 'bottom',
  dress: 'dress',
  apron: 'apron',
  tote: 'bag',
  shoulder: 'bag',
  bucketbag: 'bag',
  drawstring: 'bag',
  pouch: 'bag',
  wallet: 'bag',
  sleeve: 'bag',
  crossbody: 'bag',
  sling: 'bag',
  buckethat: 'item',
  headband: 'item',
  bandana: 'item',
  scrunchie: 'item',
  keychain: 'item',
  lanyard: 'item',
  cushion: 'item',
  coasters: 'item',
  planter: 'item',
  shadowbox: 'item',
  repaint: 'item',
  sneaker: 'item',
}

export interface SpecField {
  key: string
  label: string
  value: number
  min: number
  max: number
}

const BAG_DIMS: Partial<Record<Shape, [number, number, number]>> = {
  tote: [38, 40, 60],
  shoulder: [30, 20, 55],
  bucketbag: [25, 28, 100],
  drawstring: [32, 40, 120],
  pouch: [20, 13, 0],
  wallet: [11, 8, 0],
  sleeve: [36, 26, 0],
  crossbody: [24, 18, 120],
  sling: [12, 18, 120],
}

const ITEM_DIMS: Partial<Record<Shape, SpecField[]>> = {
  buckethat: [
    { key: 'head', label: 'Head circumference', value: 57, min: 50, max: 64 },
    { key: 'brim', label: 'Brim width', value: 6, min: 3, max: 10 },
  ],
  headband: [
    { key: 'head', label: 'Head circumference', value: 56, min: 48, max: 64 },
    { key: 'width', label: 'Band width', value: 8, min: 3, max: 14 },
  ],
  bandana: [{ key: 'neck', label: 'Neck circumference', value: 36, min: 20, max: 60 }],
  scrunchie: [{ key: 'diameter', label: 'Diameter', value: 12, min: 6, max: 18 }],
  keychain: [{ key: 'length', label: 'Length', value: 12, min: 6, max: 20 }],
  lanyard: [{ key: 'length', label: 'Loop length', value: 90, min: 40, max: 120 }],
  cushion: [
    { key: 'width', label: 'Width', value: 45, min: 30, max: 60 },
    { key: 'height', label: 'Height', value: 45, min: 30, max: 60 },
  ],
  coasters: [{ key: 'diameter', label: 'Diameter', value: 10, min: 8, max: 14 }],
}

/** Generic body used when the user has no profile — the preview says so. */
export const SAMPLE_BODY: FitProfile = { model: 'neutral', height: 168, bust: 92, waist: 76, hips: 98 }

const EASE: Record<FitPref, number> = { fitted: 0, relaxed: 1, oversized: 2 }

/**
 * AI-generated measurements for the chosen idea. Wearables are cut from the body
 * (saved or temporary profile) plus ease for the preferred fit; bags and accessories use standard sizes.
 */
export function upcycleFields(idea: Idea, body: FitProfile, fit: FitPref): SpecField[] {
  const shape = idea.mock.shape
  const form = FORM_OF[shape]
  const e = EASE[fit]
  const h = body.height / 168
  const L = (cm: number) => Math.round(cm * h)
  const f = (key: string, label: string, value: number, min: number, max: number): SpecField => ({ key, label, value: r1(value), min, max })
  switch (form) {
    case 'top':
      return [f('chest', 'Chest', body.bust + [4, 10, 20][e], 60, 170), f('length', 'Length', L([44, 46, 50][e]), 25, 90), f('sleeve', 'Sleeve length', [18, 20, 24][e], 0, 80)]
    case 'corset':
      return [f('chest', 'Bust', body.bust - [2, 0, 2][e], 55, 160), f('waist', 'Waist', body.waist + [0, 2, 4][e], 45, 160), f('length', 'Length', L(34), 20, 50)]
    case 'vest':
      return [f('chest', 'Chest', body.bust + [8, 14, 24][e], 60, 180), f('length', 'Length', L([52, 56, 62][e]), 30, 90)]
    case 'outer':
      return [f('chest', 'Chest', body.bust + [12, 16, 26][e], 60, 190), f('length', 'Length', L([62, 66, 72][e]), 40, 100), f('sleeve', 'Sleeve length', L(60), 0, 85)]
    case 'skirt':
      return [f('waist', 'Waist', body.waist + 2, 45, 160), f('hips', 'Hips', body.hips + [4, 8, 14][e], 60, 180), f('length', 'Length', L(shape === 'midiskirt' ? 70 : 42), 25, 100)]
    case 'shorts':
    case 'bottom':
      return [f('waist', 'Waist', body.waist + 2, 45, 160), f('hips', 'Hips', body.hips + [4, 8, 14][e], 60, 180), f('length', 'Outseam length', L(form === 'shorts' ? 38 : 100), 20, 120)]
    case 'dress':
      return [f('chest', 'Bust', body.bust + [4, 6, 12][e], 60, 170), f('waist', 'Waist', body.waist + [2, 6, 14][e], 45, 170), f('length', 'Length', L(92), 50, 130)]
    case 'apron':
      return [f('width', 'Width', 60, 40, 80), f('length', 'Length', L(85), 50, 110), f('tie', 'Waist tie (each)', 70, 30, 120)]
    case 'bag': {
      const [w, ht, strap] = BAG_DIMS[shape] ?? [30, 30, 60]
      return [f('width', 'Width', w, 6, 60), f('height', 'Height', ht, 6, 60), ...(strap ? [f('strap', 'Strap length', strap, 20, 150)] : [])]
    }
    default:
      return (ITEM_DIMS[shape] ?? []).map((x) => ({ ...x }))
  }
}

export const fieldValue = (fields: SpecField[], key: string) => fields.find((x) => x.key === key)?.value

/** Validates a measurement field. Returns an error message, or null. */
export function fieldError(raw: string, f: SpecField): string | null {
  const t = raw.trim()
  if (!t) return `Enter the ${f.label.toLowerCase()} in cm.`
  const n = Number(t)
  if (!Number.isFinite(n)) return 'Use numbers only.'
  if (n < f.min || n > f.max) return `Enter ${f.min}–${f.max} cm.`
  return null
}

/** Usable fabric the source garment offers (cm). */
function sourceFabric(p: GarmentProfile) {
  const m = garmentMeasures(p)
  const kind = KIND_OF[p.category]
  const circ = m.chest ?? m.hips ?? 100
  const len = m.length ?? 60
  // Largest single flat panel: a jacket/shirt back, or one trouser leg.
  const panelW = kind === 'bottom' ? (m.hips ?? 100) / 4 + 6 : kind === 'none' ? 30 : circ / 2 - 4
  const panelH = kind === 'bottom' ? len - 12 : kind === 'none' ? 25 : len - 8
  const strap = kind === 'bottom' ? len * 2 : (m.sleeve ?? 40) * 2
  return { m, kind, circ, len, panelW, panelH, strap }
}

/** AI feasibility estimate for an upcycle at the requested measurements. */
export function upcycleFeasibility(p: GarmentProfile, idea: Idea, fields: SpecField[], body: FitProfile | null): Feasibility {
  const notes: FeasibilityNote[] = []
  const add = (verdict: Verdict, text: string) => notes.push({ verdict, text })
  const src = sourceFabric(p)
  const form = FORM_OF[idea.mock.shape]
  const patch = !!idea.mock.patch
  const v = (k: string) => fieldValue(fields, k)

  const length = v('length')
  if (length !== undefined && form !== 'item' && form !== 'bag') {
    // Bottoms opened into a top or skirt only give the upper part of the leg in one piece.
    const avail = src.kind === 'bottom' && form !== 'bottom' && form !== 'shorts' ? src.len * 0.62 : src.len - 3
    if (length <= avail) add('ok', `Length ${length} cm fits within the ${p.garment}’s usable ${Math.round(avail)} cm.`)
    else if (patch && length <= avail * 1.2) add('caution', `Length ${length} cm needs pieced panels — fine for patchwork, with extra seams.`)
    else add('no', `The ${p.garment} only gives about ${Math.round(avail)} cm of length — ${length} cm needs extra fabric.`)
  }
  const circ = v('chest') ?? v('hips')
  if (circ !== undefined && form !== 'bag' && form !== 'item') {
    const avail = src.kind === 'bottom' ? (src.m.hips ?? 100) + 30 : src.circ
    if (circ <= avail) add('ok', `${v('chest') !== undefined ? 'Chest' : 'Hips'} of ${circ} cm can be cut from the ${p.garment} (about ${Math.round(avail)} cm available).`)
    else if (patch || circ <= avail + 6) add('caution', `${circ} cm is wider than the ${p.garment} — side panels from offcuts will be added.`)
    else add('no', `${circ} cm is much wider than the ${p.garment} can supply (about ${Math.round(avail)} cm).`)
  }
  const waist = v('waist')
  if (waist !== undefined && (form === 'shorts' || form === 'skirt') && src.kind === 'bottom' && src.m.waist) {
    if (waist > src.m.waist + 3) add('no', `Keeping the original waistband limits the waist to about ${src.m.waist + 3} cm.`)
    else if (waist < src.m.waist - 8) add('caution', `Taking the waistband in by ${Math.round(src.m.waist - waist)} cm moves the pockets closer together.`)
    else add('ok', 'The original waistband can be kept — the strongest, best-finished part of the garment.')
  }
  const sleeve = v('sleeve')
  if (sleeve !== undefined && sleeve > 0) {
    const avail = src.m.sleeve ?? 0
    if (!avail) add(patch ? 'caution' : 'no', `Your ${p.garment} has no sleeves to reuse — ${sleeve} cm sleeves need fabric from elsewhere.`)
    else if (sleeve <= avail - 2) add('ok', `Sleeves (${sleeve} cm) can be cut from the original ${avail} cm sleeves.`)
    else add('no', `Sleeves of ${sleeve} cm are longer than the original (${avail} cm).`)
  }
  if (form === 'bag') {
    const w = v('width') ?? 0
    const ht = v('height') ?? 0
    const fits = (a: number, b: number) => a <= src.panelW && b <= src.panelH
    if (fits(w, ht) || fits(ht, w)) add('ok', `A ${w} × ${ht} cm panel fits in one piece (largest panel about ${Math.round(src.panelW)} × ${Math.round(src.panelH)} cm).`)
    else if (w <= src.panelW * 1.6 && ht <= src.panelH * 1.3) add('caution', `${w} × ${ht} cm needs two panels joined — a visible seam across the bag.`)
    else add('no', `${w} × ${ht} cm is larger than the ${p.garment} can supply.`)
    const strap = v('strap')
    if (strap) {
      if (strap <= src.strap * 0.8) add('ok', `${strap} cm strap can be cut from the ${src.kind === 'bottom' ? 'legs' : 'sleeves'}.`)
      else add('caution', `A ${strap} cm strap will be pieced or finished with webbing.`)
    }
  }
  if (form === 'item' && !fields.length) add('ok', 'One-size piece — no measurements needed.')

  if (body && form !== 'bag' && form !== 'item') {
    const chest = v('chest')
    if (chest !== undefined) {
      const ease = chest - body.bust
      if (ease < (form === 'corset' ? -4 : 0)) add('no', `Bust/chest ${chest} cm is smaller than the wearer’s ${body.bust} cm — it won’t close.`)
      else if (ease < (form === 'corset' ? 0 : 4)) add('caution', `Close fit: ${r1(ease)} cm of ease at the chest.`)
    }
    if (waist !== undefined && waist < body.waist - (form === 'corset' ? 4 : 0)) add('no', `Waist ${waist} cm is smaller than the wearer’s ${body.waist} cm.`)
  }
  if (idea.difficulty === 'Advanced') add('caution', `Advanced construction — allow about ${idea.days} working days.`)
  if (p.condition < 0.6) add('caution', `Visible wear — the maker will cut around worn areas of the ${p.garment}.`)
  if (p.material === 'leather') add('caution', 'Leather needs a specialist maker and needles.')
  return summarise(notes, 'upcycle')
}

/* ------------------------------------------------------------------ */
/* Concept details: modifications, descriptions, trends                */
/* ------------------------------------------------------------------ */

const MODS: Record<string, string[]> = {
  tote: ['Remove sleeves and collar', 'Cut front and back body into two matching panels', 'Interface panels for structure', 'Cut straps from sleeve fabric'],
  miniskirt: ['Open seams and cut panels from the strongest areas', 'Piece panels into a patchwork front and back', 'Add waistband and back zip', 'Hem at mid-thigh'],
  vest: ['Remove both sleeves', 'Re-cut and bind armholes', 'Shorten body to a cropped hem', 'Keep original collar and buttons'],
  buckethat: ['Cut crown, side band and brim from the back panel', 'Interface the brim', 'Top-stitch brim rows', 'Line with a cotton offcut'],
  corset: ['Deconstruct body into front and back panels', 'Re-cut into shaped corset panels', 'Insert boning channels', 'Add lace-up back'],
  shoulder: ['Cut half-moon panels from the back', 'Add interfacing and lining', 'Insert zip', 'Make shoulder strap from offcuts'],
  sling: ['Cut a small front pocket panel', 'Bind the edges', 'Add a long adjustable strap', 'Fit a snap closure'],
  shorts: ['Cut legs to shorts length', 'Patch worn areas with offcuts', 'Re-hem or fray hem', 'Keep original waistband'],
  sleeve: ['Cut one large flat panel', 'Add foam padding layer', 'Line and bind edges', 'Fit zip closure'],
  pouch: ['Cut two small clean panels', 'Insert zip', 'Line with offcut', 'Add a wrist loop'],
  croptop: ['Shorten body to a cropped length', 'Re-hem the new edge', 'Shorten sleeves', 'Optional: add tie front'],
  scrunchie: ['Cut three sleeve strips', 'Sew into tubes', 'Thread elastic', 'Close seams'],
  cushion: ['Cut front and back squares', 'Add envelope back', 'Overlock edges', 'Turn and press'],
  apron: ['Cut bib and skirt from the body', 'Add patch pocket', 'Make neck strap and waist ties', 'Bind all edges'],
  patchjacket: ['Deconstruct jacket into panels', 'Combine with contrast patch panels', 'Re-assemble the chore-coat body', 'Add patch pockets'],
  dress: ['Open the legs into panels', 'Cut bib front and skirt', 'Reuse original hardware for straps', 'Hem at the knee'],
  midiskirt: ['Open garment into long panels', 'Pleat panels into a waistband', 'Add side zip', 'Hem below the knee'],
  crossbody: ['Cut body panels and pocket flap', 'Reuse original hardware as the clasp', 'Line the bag', 'Add adjustable strap'],
  bandana: ['Cut one triangle', 'Hem all edges', 'Add snap closure'],
  headband: ['Cut a strip from the hem', 'Sew into a tube', 'Knot and close at the back'],
  drawstring: ['Cut a tube from the body', 'Reuse original hem as the casing', 'Thread drawcord', 'Close base seam'],
  bucketbag: ['Cut a round base and side panel', 'Interface the base', 'Add drawcord eyelets', 'Add strap'],
  shirtdress: ['Keep button front and collar', 'Take in side seams', 'Add waist tie belt', 'Re-hem to dress length'],
  coasters: ['Cut four discs from scraps', 'Back with felt', 'Top-stitch edges'],
  keychain: ['Cut a strip including the brand label', 'Fold and stitch', 'Add key ring hardware'],
  wallet: ['Cut outer and card-slot panels', 'Edge-finish', 'Stitch card pockets', 'Fold and press'],
  repaint: ['Clean and prep uppers', 'Mask soles', 'Hand-paint custom design', 'Seal with finisher'],
  planter: ['Clean shoe', 'Line with waterproof liner', 'Add soil and plant'],
  shadowbox: ['Clean and stuff shoe', 'Mount in a deep frame', 'Add label plate'],
  lanyard: ['Braid laces and webbing', 'Add clasp', 'Stitch ends'],
}

const DESC: Record<string, string> = {
  tote: 'Turn the main body into a structured everyday tote.',
  miniskirt: 'Rebuild the fabric into a pieced patchwork mini skirt.',
  vest: 'Remove the sleeves and restructure the front into a cropped vest.',
  buckethat: 'Cut a full bucket hat from a single panel.',
  corset: 'Restructure the garment into a fitted, boned corset top.',
  shoulder: 'A clean half-moon shoulder bag with minimal waste.',
  sling: 'A small phone sling from offcuts.',
  shorts: 'Cut down and patch into a pair of shorts.',
  sleeve: 'A padded sleeve for a 14" laptop.',
  pouch: 'A small zip pouch from the cleanest panels.',
  croptop: 'Shorten the body into a boxy cropped top.',
  scrunchie: 'Three scrunchies from the sleeves.',
  cushion: 'A statement cushion cover.',
  apron: 'A hard-wearing work apron with a pocket.',
  patchjacket: 'A one-off patchwork chore jacket.',
  dress: 'A bib-front pinafore dress.',
  midiskirt: 'A pleated midi skirt from long panels.',
  crossbody: 'A crossbody bag using the original pockets and hardware.',
  bandana: 'A pet bandana from one triangle.',
  headband: 'A soft knotted headband.',
  drawstring: 'A simple drawstring bag.',
  bucketbag: 'A round-base bucket bag.',
  shirtdress: 'A belted shirt dress keeping the button front.',
  coasters: 'A set of four coasters from scraps.',
  keychain: 'A keyring that keeps the brand label.',
  wallet: 'A compact card wallet.',
  repaint: 'A hand-painted one-of-one pair.',
  planter: 'A shoe planter for a desk.',
  shadowbox: 'Framed shoe wall art.',
  lanyard: 'A braided lanyard from laces and straps.',
}

export const modsOf = (idea: Idea) => MODS[idea.id] ?? ['Deconstruct the garment', 'Cut new pattern pieces', 'Assemble and finish']
export const descOf = (idea: Idea) => DESC[idea.id] ?? `Turn it into a ${idea.title.toLowerCase()}.`

/** Silhouette character of each idea, for matching the user's fit preference. */
const IDEA_FIT: Record<string, FitPref> = {
  corset: 'fitted',
  miniskirt: 'fitted',
  midiskirt: 'fitted',
  shirtdress: 'relaxed',
  dress: 'relaxed',
  croptop: 'relaxed',
  shorts: 'relaxed',
  vest: 'oversized',
  patchjacket: 'oversized',
  tote: 'oversized',
}

export interface Trend {
  id: string
  label: string
  heat: number
  ideas: string[]
  styles: Style[]
}

/** Curated trend signals for the prototype (autumn/winter 2026). Simulated — not a live trend feed. */
export const TRENDS: Trend[] = [
  { id: 'boxy', label: 'Boxy cropped silhouettes', heat: 92, ideas: ['croptop', 'vest'], styles: ['Streetwear', 'Y2K', 'Casual'] },
  { id: 'utility', label: 'Utility & gorpcore details', heat: 88, ideas: ['vest', 'sling', 'crossbody', 'apron', 'sleeve'], styles: ['Functional', 'Streetwear'] },
  { id: 'patch', label: 'Patchwork & visible mending', heat: 86, ideas: ['miniskirt', 'shorts', 'patchjacket'], styles: ['Vintage', 'Streetwear'] },
  { id: 'corsetry', label: 'Soft corsetry', heat: 81, ideas: ['corset', 'dress'], styles: ['Elegant', 'Y2K', 'Vintage'] },
  { id: 'quiet', label: 'Quiet minimalism', heat: 79, ideas: ['shoulder', 'tote', 'midiskirt', 'shirtdress', 'wallet', 'bucketbag'], styles: ['Minimal', 'Elegant'] },
  { id: 'y2k', label: 'Y2K accessories', heat: 74, ideas: ['buckethat', 'headband', 'scrunchie', 'keychain'], styles: ['Y2K', 'Cute'] },
]
export const TREND_SOURCE = 'Simulated trend signals · prototype dataset, Oct 2026'

export interface Concept {
  idea: Idea
  description: string
  pitch: string
  mods: string[]
  trend: Trend | null
  matched: Style[]
  fitMatch: boolean
  feasibility: Feasibility
  score: number
}

const fitWord: Record<FitPref, string> = { fitted: 'fitted', relaxed: 'relaxed', oversized: 'oversized' }

/**
 * RE:PLAY+ concepts: every idea the garment can become, scored against the user's styles,
 * preferred fit, trend signals and their own history — then the best distinct four.
 */
export function plusConcepts(p: GarmentProfile, style: StyleProfile, history: { ideaId?: string; type?: string; styles?: Style[] }[], body: FitProfile): Concept[] {
  const ideas = allIdeas(p, style.styles)
  const pastTypes = new Set(history.map((h) => h.type).filter(Boolean))
  const pastIdeas = new Set(history.map((h) => h.ideaId).filter(Boolean))
  const pastStyles = new Set(history.flatMap((h) => h.styles ?? []))
  const scored = ideas.map((idea): Concept => {
    const matched = idea.styles.filter((s) => style.styles.includes(s))
    const ideaFit = IDEA_FIT[idea.id]
    const fitMatch = !ideaFit || ideaFit === style.fit
    const trend = TRENDS.filter((t) => t.ideas.includes(idea.id)).sort((a, b) => b.heat - a.heat)[0] ?? null
    const trendBoost = trend ? trend.heat / 30 + (trend.styles.some((s) => style.styles.includes(s)) ? 1 : 0) : 0
    let score = Math.min(2, matched.length) * 3 + trendBoost + (ideaFit ? (fitMatch ? 2 : -1.5) : 0)
    if (pastTypes.has(idea.type)) score += 0.8
    if (idea.styles.some((s) => pastStyles.has(s))) score += 0.6
    if (pastIdeas.has(idea.id)) score -= 2
    // Wearables first — they show off the preview — but never at the cost of style match.
    if (FORM_OF[idea.mock.shape] !== 'bag' && FORM_OF[idea.mock.shape] !== 'item') score += 0.7
    const feasibility = upcycleFeasibility(p, idea, upcycleFields(idea, body, style.fit), body)
    if (feasibility.verdict === 'no') score -= 6
    const description = descOf(idea)
    const styleTxt = (matched.length ? matched : style.styles.slice(0, 1)).join(' / ').toLowerCase()
    const pitch = `Based on your ${p.garment} and preferred ${styleTxt}${ideaFit && fitMatch ? `, ${fitWord[style.fit]}` : ''} style: ${description.charAt(0).toLowerCase()}${description.slice(1, -1)}${trend ? `, inspired by ${trend.label.toLowerCase()}` : ''}.`
    return { idea, description, pitch, mods: modsOf(idea), trend, matched, fitMatch, feasibility, score }
  })
  scored.sort((a, b) => b.score - a.score)
  const out: Concept[] = []
  const perType = new Map<string, number>()
  for (const c of scored) {
    const n = perType.get(c.idea.type) ?? 0
    if (n >= 2) continue
    out.push(c)
    perType.set(c.idea.type, n + 1)
    if (out.length === 4) break
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Makers                                                              */
/* ------------------------------------------------------------------ */

export interface Maker {
  name: string
  focus: string
  rating: number
  area: string
}

const MAKERS: Record<string, Maker> = {
  'ReThread SG': { name: 'ReThread SG', focus: 'Alterations & tailoring', rating: 4.9, area: 'Tanjong Pagar' },
  'Maya Studio': { name: 'Maya Studio', focus: 'Denim & reconstruction', rating: 4.8, area: 'Jalan Besar' },
  'Studio Hollow': { name: 'Studio Hollow', focus: 'Accessories & custom paint', rating: 4.7, area: 'Tiong Bahru' },
  'DIY kit': { name: 'DIY kit', focus: 'Pattern + video guide, made by you', rating: 4.6, area: 'Delivered to you' },
}

/** Simulated maker matching. */
export function makerFor(kind: 'alter' | 'upcycle', p: GarmentProfile, idea?: Idea): Maker {
  if (kind === 'upcycle' && idea) return MAKERS[idea.maker] ?? { name: idea.maker, focus: 'Upcycling', rating: 4.7, area: 'Singapore' }
  return p.material === 'denim' || p.material === 'leather' ? MAKERS['Maya Studio'] : MAKERS['ReThread SG']
}

/* ------------------------------------------------------------------ */
/* Maker-ready specification + saved designs                           */
/* ------------------------------------------------------------------ */

export interface MakerSpec {
  item: string
  garment: string
  material: string
  size: string
  type: 'ALTER' | 'UPCYCLE'
  concept?: string
  requested?: string[]
  areas?: string
  fee?: number
  measurements: { label: string; value: string }[]
  body?: string
  feasibility: { verdict: Verdict; label: string; notes: string[] }
  modifications: string[]
  notes: string
  maker: string
  generatedAt: string
}

export type DesignStatus = 'Draft' | 'Ready for Maker' | 'In Progress' | 'Completed'

export interface Design {
  id: string
  itemId: string
  itemName: string
  itemImg: string
  kind: 'alter' | 'upcycle'
  title: string
  status: DesignStatus
  spec: MakerSpec
  /** Inputs needed to reopen the design and regenerate its 2D / 3D previews */
  alter?: AlterChange[]
  idea?: Idea
  fields?: SpecField[]
  fit?: FitPref
  body?: FitProfile | null
  /** ALTER fee or making cost */
  price: number
  /** Estimated value of the result (upcycles) */
  value?: number
  preview: { form: TargetForm | GarmentKind; shape: Shape; colour: string }
  createdAt: string
  updatedAt: string
}

export const bodyLine = (b: FitProfile | null, source: string) =>
  b ? `${source} — height ${b.height} cm · bust ${b.bust} · waist ${b.waist} · hips ${b.hips} cm` : 'No body profile — sizes from the garment label'

export function alterSpec(p: GarmentProfile, item: string, m: GarmentMeasures, changes: AlterChange[], feas: Feasibility, notes: string, body: FitProfile | null, bodySource: string): MakerSpec {
  const after = alteredMeasures(m, changes)
  const areas = alterAreas(p)
  const nameOf = (id: AreaId) => areas.find((a) => a.id === id)?.short ?? id
  return {
    item,
    garment: p.garment,
    material: p.material,
    size: p.size,
    type: 'ALTER',
    requested: changes.map((c) => `${nameOf(c.area)}: ${fmtCm(signed(c))}`),
    areas: changes.map((c) => nameOf(c.area)).join(' + '),
    fee: alterFee(changes.length),
    measurements: changes.map((c) => ({ label: nameOf(c.area), value: `${m[c.area] ?? '?'} cm → ${after[c.area] ?? '?'} cm` })),
    body: bodyLine(body, bodySource),
    feasibility: { verdict: feas.verdict, label: VERDICT_LABEL[feas.verdict], notes: feas.notes.filter((n) => n.verdict !== 'ok').map((n) => n.text) },
    modifications: changes.map((c) => {
      const a = c.amount
      switch (c.area) {
        case 'length':
          return c.dir === 'decrease' ? `Shorten by ${a} cm and re-hem matching the original finish` : `Let down hem by ${a} cm; face the hem if allowance is short`
        case 'sleeve':
          return c.dir === 'decrease' ? `Shorten both sleeves by ${a} cm, re-set cuffs` : `Lengthen both sleeves by ${a} cm from cuff allowance`
        case 'leg':
          return c.dir === 'decrease' ? `Taper leg opening by ${a} cm, knee to hem, both legs` : `Widen leg opening by ${a} cm from inseam allowance`
        default:
          return c.dir === 'decrease' ? `Take in ${nameOf(c.area).toLowerCase()} by ${a} cm total, evenly at side seams` : `Let out ${nameOf(c.area).toLowerCase()} by ${a} cm total from seam allowance`
      }
    }),
    notes,
    maker: '',
    generatedAt: new Date().toISOString(),
  }
}

export function upcycleSpec(p: GarmentProfile, item: string, idea: Idea, fields: SpecField[], feas: Feasibility, notes: string, body: FitProfile | null, bodySource: string, fit: FitPref): MakerSpec {
  const wearable = FORM_OF[idea.mock.shape] !== 'bag' && FORM_OF[idea.mock.shape] !== 'item'
  return {
    item,
    garment: p.garment,
    material: p.material,
    size: p.size,
    type: 'UPCYCLE',
    concept: idea.title,
    measurements: [...fields.map((f) => ({ label: f.label, value: `${f.value} cm` })), ...(wearable ? [{ label: 'Fit', value: fit.charAt(0).toUpperCase() + fit.slice(1) }] : [])],
    body: wearable ? bodyLine(body, bodySource) : undefined,
    feasibility: { verdict: feas.verdict, label: VERDICT_LABEL[feas.verdict], notes: feas.notes.filter((n) => n.verdict !== 'ok').map((n) => n.text) },
    modifications: modsOf(idea),
    notes,
    maker: idea.maker,
    generatedAt: new Date().toISOString(),
  }
}

/** A synthetic "idea" for an alteration, so the existing progress, dashboard and passport views can track it. */
export function alterIdea(p: GarmentProfile, changes: AlterChange[], mock: MockSpec, maker: Maker, value: number): Idea {
  const fee = alterFee(changes.length)
  return {
    id: 'alter',
    title: 'Fit alteration',
    type: 'Other',
    styles: [],
    style: 'Minimal',
    difficulty: changes.length >= 3 ? 'Medium' : 'Easy',
    sale: value,
    cost: fee,
    shippingOut: 0,
    investment: Math.round((p.acquisition + fee) * 100) / 100,
    profit: 0,
    days: 2 + changes.length,
    maker: maker.name,
    why: changes.map(changeLabel).join(' · '),
    mock,
    misses: [],
  }
}

/** Delivery is charged once per order and never mixed into transformation prices. */
export const DELIVERY_NOTE = `Item price and S$${DELIVERY_FEE.toFixed(2)} Singapore Local Delivery (once per order) are charged at checkout — separate from alteration fees and RE:PLAY+.`

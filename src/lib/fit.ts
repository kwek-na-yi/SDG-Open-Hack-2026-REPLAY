/**
 * RE:PLAY AI Fit Preview — prototype body model.
 *
 * Turns a few body measurements into approximate body landmarks (in cm) that
 * the fit preview draws a model from, and works out where a transformed item
 * sits on the body. Deterministic and offline: no image-generation service.
 * It is an illustrative estimate, never an exact representation of anyone's body.
 */
import type { Shape } from './mock'

export type ModelType = 'female' | 'male' | 'neutral'
export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'
export type Measure = 'height' | 'bust' | 'waist' | 'hips'

export interface FitProfile {
  model: ModelType
  height: number
  bust: number
  waist: number
  hips: number
  /** Optional size the user usually wears */
  size?: Size
}

export const MODEL_TYPES: { id: ModelType; label: string }[] = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'neutral', label: 'Neutral' },
]
export const SIZES: Size[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

/** Accepted ranges (cm). Wide on purpose — bodies vary; this only catches typos. */
const LIMITS: Record<Measure, [number, number]> = {
  height: [130, 210],
  bust: [60, 160],
  waist: [45, 160],
  hips: [65, 170],
}
export const MEASURE_LABEL: Record<Measure, string> = { height: 'Height', bust: 'Bust / chest', waist: 'Waist', hips: 'Hips' }

/** Sample profiles for quick demos — clearly labelled as samples in the UI. */
export const SAMPLE_PROFILES: { label: string; profile: FitProfile }[] = [
  { label: 'Sample A', profile: { model: 'female', height: 162, bust: 86, waist: 68, hips: 92, size: 'S' } },
  { label: 'Sample B', profile: { model: 'male', height: 178, bust: 100, waist: 84, hips: 98, size: 'M' } },
  { label: 'Sample C', profile: { model: 'neutral', height: 170, bust: 96, waist: 88, hips: 104 } },
]

export type FitDraft = Record<Measure, string> & { model: ModelType; size: Size | '' }

export const draftOf = (p: FitProfile | null): FitDraft =>
  p
    ? { model: p.model, height: String(p.height), bust: String(p.bust), waist: String(p.waist), hips: String(p.hips), size: p.size ?? '' }
    : { model: 'female', height: '', bust: '', waist: '', hips: '', size: '' }

/** Validates the form. Returns the profile, or a friendly message per invalid field. */
export function validateFit(d: FitDraft): { profile: FitProfile | null; errors: Partial<Record<Measure, string>> } {
  const errors: Partial<Record<Measure, string>> = {}
  const values = {} as Record<Measure, number>
  for (const k of Object.keys(LIMITS) as Measure[]) {
    const raw = d[k].trim()
    const [lo, hi] = LIMITS[k]
    const n = Number(raw)
    if (!raw) errors[k] = `Please enter your ${MEASURE_LABEL[k].toLowerCase()} in cm.`
    else if (!Number.isFinite(n)) errors[k] = 'Use numbers only, e.g. 72.'
    else if (n < lo || n > hi) errors[k] = `Enter a value between ${lo} and ${hi} cm.`
    else values[k] = Math.round(n * 10) / 10
  }
  if (Object.keys(errors).length) return { profile: null, errors }
  return { profile: { model: d.model, ...values, size: d.size || undefined }, errors }
}

/* ------------------------------------------------------------------ */
/* Size estimate                                                       */
/* ------------------------------------------------------------------ */

// Upper bounds (cm) for XS, S, M, L, XL — anything above is XXL. Generic, not any brand's chart.
const CHART: Record<ModelType, { bust: number[]; waist: number[]; hips: number[] }> = {
  female: { bust: [82, 88, 94, 100, 108], waist: [64, 70, 76, 82, 90], hips: [88, 94, 100, 106, 114] },
  male: { bust: [86, 94, 102, 110, 118], waist: [72, 80, 88, 96, 104], hips: [88, 96, 104, 112, 120] },
  neutral: { bust: [84, 91, 98, 105, 113], waist: [68, 75, 82, 89, 97], hips: [88, 95, 102, 109, 117] },
}
const bucket = (v: number, bounds: number[]) => {
  const i = bounds.findIndex((b) => v < b)
  return i === -1 ? bounds.length : i
}

/** Closest generic size — takes the largest of bust, waist and hips so nothing is cut too small. */
export function estimateSize(p: FitProfile): Size {
  const c = CHART[p.model]
  return SIZES[Math.max(bucket(p.bust, c.bust), bucket(p.waist, c.waist), bucket(p.hips, c.hips))]
}

/* ------------------------------------------------------------------ */
/* Body landmarks                                                      */
/* ------------------------------------------------------------------ */

export interface Body {
  H: number
  headH: number
  headW: number
  neckW: number
  shoulderY: number
  armpitY: number
  bustY: number
  waistY: number
  hipY: number
  crotchY: number
  kneeY: number
  ankleY: number
  shoulderHalf: number
  bustHalf: number
  waistHalf: number
  hipHalf: number
  armW: number
  /** Arm centreline: shoulder joint, elbow, wrist (right side; mirror for left) */
  arm: [number, number][]
  /** Leg centreline x at crotch, knee, ankle */
  legX: [number, number, number]
  legW: [number, number, number]
  /** Torso half-width at any height (cm from the top of the head) */
  tw: (y: number) => number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * Approximate front-view body, in cm, from the top of the head (y = 0) down, centred on x = 0.
 * Circumferences become front widths by treating each cross-section as an ellipse.
 */
export function bodyOf(p: FitProfile): Body {
  const H = p.height
  const headH = H * 0.13
  const headW = headH * (p.model === 'male' ? 0.76 : 0.72)
  const neckW = headW * (p.model === 'male' ? 0.6 : 0.52)
  const shoulderY = H * 0.185
  const armpitY = shoulderY + H * 0.05
  const bustY = H * 0.27
  const waistY = H * (p.model === 'female' ? 0.38 : p.model === 'male' ? 0.4 : 0.39)
  const hipY = H * 0.5
  const crotchY = H * 0.525
  const kneeY = H * 0.72
  const ankleY = H * 0.955

  const bustHalf = p.bust / 5.4
  const waistHalf = Math.min(p.waist / 5.55, Math.max(bustHalf, p.hips / 5.45) + 2)
  const hipHalf = p.hips / 5.45
  const shoulderHalf = Math.max(bustHalf + 2.5, p.bust * (p.model === 'female' ? 0.205 : p.model === 'male' ? 0.235 : 0.22))
  const armW = clamp(p.bust * 0.1, 7, 14)

  const sx = shoulderHalf - armW * 0.42
  const wx = Math.max(hipHalf + armW * 0.32 + 1.5, sx + 2)
  const arm: [number, number][] = [
    [sx, shoulderY + 3],
    [(sx + wx) / 2 + 0.8, waistY],
    [wx, crotchY - H * 0.02],
  ]
  const legX: [number, number, number] = [hipHalf * 0.5, hipHalf * 0.4, hipHalf * 0.36]
  const legW: [number, number, number] = [hipHalf * 1.0, clamp(p.hips * 0.11, 9, 14), 6.5]

  const pts: [number, number][] = [
    [shoulderY, shoulderHalf - 1.5],
    [armpitY, bustHalf + 0.6],
    [bustY, bustHalf],
    [waistY, waistHalf],
    [hipY, hipHalf],
    [crotchY, hipHalf * 0.98],
  ]
  const tw = (y: number) => {
    if (y <= pts[0][0]) return pts[0][1]
    for (let i = 1; i < pts.length; i++) {
      const [y1, w1] = pts[i]
      const [y0, w0] = pts[i - 1]
      if (y <= y1) return w0 + ((w1 - w0) * (y - y0)) / (y1 - y0)
    }
    return pts[pts.length - 1][1]
  }

  return { H, headH, headW, neckW, shoulderY, armpitY, bustY, waistY, hipY, crotchY, kneeY, ankleY, shoulderHalf, bustHalf, waistHalf, hipHalf, armW, arm, legX, legW, tw }
}

/* ------------------------------------------------------------------ */
/* Where each transformation is worn                                   */
/* ------------------------------------------------------------------ */

export type Zone = 'bottom' | 'top' | 'outer' | 'dress' | 'apron' | 'hand' | 'crossbody' | 'head' | 'neck' | 'wrist' | 'feet'

const ZONE: Partial<Record<Shape, Zone>> = {
  miniskirt: 'bottom',
  midiskirt: 'bottom',
  shorts: 'bottom',
  croptop: 'top',
  corset: 'top',
  vest: 'top',
  jacket: 'outer',
  dress: 'dress',
  apron: 'apron',
  tote: 'hand',
  shoulder: 'hand',
  bucketbag: 'hand',
  drawstring: 'hand',
  pouch: 'hand',
  wallet: 'hand',
  keychain: 'hand',
  sleeve: 'hand',
  crossbody: 'crossbody',
  sling: 'crossbody',
  buckethat: 'head',
  headband: 'head',
  bandana: 'neck',
  lanyard: 'neck',
  scrunchie: 'wrist',
  repaint: 'feet',
}

/** Where the item is worn, or null for homeware that can't be tried on (cushions, coasters, planters, wall art). */
export const zoneOf = (shape: Shape): Zone | null => ZONE[shape] ?? null

export const ZONE_LABEL: Record<Zone, string> = {
  bottom: 'Worn at the waist',
  top: 'Worn on the upper body',
  outer: 'Worn as an outer layer',
  dress: 'Full-length piece',
  apron: 'Worn over your outfit',
  hand: 'Carried in hand',
  crossbody: 'Worn across the body',
  head: 'Worn on the head',
  neck: 'Worn at the neck',
  wrist: 'Worn on the wrist',
  feet: 'Worn on the feet',
}

/** Garment hem/top positions shared by the drawing and the fit notes, so the numbers match the picture. */
export function garmentSpan(shape: Shape, b: Body): { top: number; hem: number } | null {
  switch (shape) {
    case 'miniskirt':
      return { top: b.waistY + b.H * 0.015, hem: b.crotchY + b.H * 0.075 }
    case 'midiskirt':
      return { top: b.waistY, hem: b.kneeY + b.H * 0.07 }
    case 'shorts':
      return { top: b.waistY + b.H * 0.01, hem: b.crotchY + b.H * 0.06 }
    case 'croptop':
      return { top: b.shoulderY, hem: b.waistY - b.H * 0.02 }
    case 'corset':
      return { top: b.bustY - b.H * 0.035, hem: b.waistY + b.H * 0.035 }
    case 'vest':
      return { top: b.shoulderY, hem: b.hipY - b.H * 0.01 }
    case 'jacket':
      return { top: b.shoulderY, hem: b.hipY + b.H * 0.025 }
    case 'dress':
      return { top: b.bustY - b.H * 0.045, hem: b.kneeY + b.H * 0.03 }
    case 'apron':
      return { top: b.bustY - b.H * 0.06, hem: b.kneeY + b.H * 0.02 }
    default:
      return null
  }
}

const round = (n: number) => Math.round(n)

/** Human-readable fit estimates for this item on this body. */
export function fitNotes(shape: Shape, p: FitProfile): string[] {
  const zone = zoneOf(shape)
  if (!zone) return []
  const b = bodyOf(p)
  const span = garmentSpan(shape, b)
  const length = span ? round(span.hem - span.top) : 0
  const hemAt = span ? (span.hem < b.crotchY + b.H * 0.1 ? 'mid-thigh' : span.hem < b.kneeY - b.H * 0.02 ? 'above the knee' : span.hem < b.kneeY + b.H * 0.04 ? 'at the knee' : 'just below the knee') : ''
  switch (zone) {
    case 'bottom':
      return [`Waistband cut to about ${round(p.waist + 2)} cm (your waist + 2 cm ease)`, `Estimated length ${length} cm — hem falls ${hemAt}`]
    case 'top':
      return [`Cut for a ${round(p.bust + (shape === 'corset' ? 0 : 6))} cm chest${shape === 'corset' ? ' — close fit, laced to adjust' : ' (bust + 6 cm ease)'}`, `Estimated length ${length} cm`]
    case 'outer':
      return [`Chest about ${round(p.bust + 10)} cm — room to layer`, `Estimated length ${length} cm, sitting at the hip`]
    case 'dress':
      return [`Bodice for a ${round(p.bust)} cm bust, waist about ${round(p.waist + 4)} cm`, `Estimated length ${length} cm — hem falls ${hemAt}`]
    case 'apron':
      return [`Ties adjust to your ${round(p.waist)} cm waist`, `Estimated length ${length} cm — hem falls ${hemAt}`]
    default:
      return ['One size — your measurements don’t change how it’s made', `Shown to scale against a ${round(p.height)} cm model`]
  }
}

/** Hex colour maths used to shade garment drawings (SVG and canvas). */
import type { Material } from './engine'

const hex = (h: string) => {
  const v = h.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16))
}
const toHex = (rgb: number[]) => '#' + rgb.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')
export const mix = (a: string, b: string, t: number) => {
  const A = hex(a)
  const B = hex(b)
  return toHex(A.map((c, i) => c + (B[i] - c) * t))
}
/** Perceived brightness, 0 (black) – 1 (white). */
const lum = (h: string) => {
  const [r, g, b] = hex(h)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

/** Colours derived from a garment's base colour: fill base, dark outline (D) and stitch thread (T). */
export function mockPaint(colour: string, material: Material) {
  const base = /^#[0-9a-f]{6}$/i.test(colour) ? colour : '#8fb3d6'
  const D = mix(base, '#000000', 0.38)
  const T = material === 'denim' ? '#d9a54a' : lum(base) > 0.65 ? mix(base, '#000000', 0.35) : mix(base, '#ffffff', 0.5)
  return { base, D, T }
}

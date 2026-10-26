import { useId } from 'react'
import type { GarmentKind, TargetForm } from '../../lib/studio'
import { MockDefs, ProductMock, type MockSpec } from '../product/ProductMock'
import { mockPaint } from '../../lib/colour'

/**
 * RE:PLAY+ 2D preview — a technical flat sketch drawn to scale (cm) from the garment's measurements.
 * The original outline is ghosted behind, so every requested change is visible. Pure SVG, instant, offline.
 */

export interface FlatDims {
  length?: number
  chest?: number
  waist?: number
  hips?: number
  sleeve?: number
  leg?: number
  width?: number
  height?: number
  strap?: number
  diameter?: number
}

type P = [number, number]
type Form = TargetForm | GarmentKind

interface Outline {
  d: string
  /** Widest half-width (cm) and lowest / highest y, for framing */
  half: number
  bottom: number
  top: number
  /** Where to put the dimension lines */
  widthAt: { y: number; half: number; label: string; value?: number } | null
  sleeveEnd?: P
}

const f = (n: number) => Math.round(n * 100) / 100
const pt = (p: P) => `${f(p[0])} ${f(p[1])}`
const poly = (ps: P[]) => `M${ps.map(pt).join(' L')} Z`
const mirror = (ps: P[]): P[] => ps.map(([x, y]) => [-x, y] as P).reverse()

function topOutline(dims: FlatDims, opts: { outer?: boolean; vest?: boolean }): Outline {
  const chest = dims.chest ?? 100
  const L = dims.length ?? 66
  const W = chest / 4
  const waistHalf = (dims.waist ?? chest * 0.95) / 4
  const hemHalf = Math.max(waistHalf, W * 0.96)
  const neck = 8
  const sh: P = [W + 2.5, 4]
  const A = Math.min(L - 6, chest * 0.21 * (opts.vest ? 1.15 : 1))
  const pit: P = [W, A]
  const waistY = A + (L - A) * 0.55
  const sleeve = opts.vest ? 0 : Math.max(0, dims.sleeve ?? 0)
  const right: P[] = [[neck, 0], sh]
  let sleeveEnd: P | undefined
  if (sleeve > 0) {
    const ang = (52 * Math.PI) / 180
    const dir: P = [Math.cos(ang), Math.sin(ang)]
    const se: P = [sh[0] + dir[0] * sleeve, sh[1] + dir[1] * sleeve]
    // The underarm seam starts lower, so it is shorter than the top of the sleeve.
    const lag = (pit[0] - sh[0]) * dir[0] + (pit[1] - sh[1]) * dir[1]
    const inner = Math.max(1.5, sleeve - lag)
    const cuff = sleeve < 28 ? 0 : 3
    const pe: P = [pit[0] + dir[0] * inner + cuff * dir[1] * 0.2, pit[1] + dir[1] * inner]
    right.push(se, pe)
    sleeveEnd = se
  }
  right.push(pit, [waistHalf, waistY], [hemHalf, L], [0.01, L])
  const left = mirror(right.slice(0, -1))
  const depth = opts.outer ? 20 : 8
  const pts = [...right, ...left]
  const d = `M${pts.map(pt).join(' L')} Q0 ${f(depth * 1.6)} ${pt(right[0])} Z`
  const half = Math.max(...pts.map((p) => Math.abs(p[0])))
  return { d, half, bottom: L, top: 0, widthAt: { y: A + 1.5, half: W, label: 'Chest', value: dims.chest }, sleeveEnd }
}

function corsetOutline(dims: FlatDims): Outline {
  const W = (dims.chest ?? 88) / 4
  const wH = (dims.waist ?? 70) / 4
  const L = dims.length ?? 34
  const right: P[] = [[0.01, 3], [W * 0.55, 0], [W, 2], [wH, L * 0.62], [wH * 1.05, L - 3], [0.01, L]]
  return { d: poly([...right, ...mirror(right)]), half: W, bottom: L, top: -12, widthAt: { y: L * 0.62, half: wH, label: 'Waist', value: dims.waist } }
}

function bottomOutline(dims: FlatDims, shorts: boolean): Outline {
  const wH = (dims.waist ?? 80) / 4
  const hH = Math.max(wH, (dims.hips ?? 100) / 4)
  const L = dims.length ?? (shorts ? 38 : 100)
  const rise = Math.min(L - 4, 27)
  const legW = (dims.leg ?? (shorts ? (dims.hips ?? 100) * 0.34 : 40)) / 2
  const xin = shorts ? 1.5 : 3
  const xout = Math.max(xin + legW, shorts ? hH : 0)
  const right: P[] = [[0.01, 0], [wH, 0], [hH, 18], [xout, L], [xin, L], [0.01, rise]]
  return { d: poly([...right, ...mirror(right)]), half: Math.max(hH, xout), bottom: L, top: 0, widthAt: { y: 0, half: wH, label: 'Waist', value: dims.waist } }
}

function skirtOutline(dims: FlatDims, flare: number): Outline {
  const wH = (dims.waist ?? 72) / 4
  const hH = Math.max(wH, (dims.hips ?? 96) / 4)
  const L = dims.length ?? 50
  const hem = hH + flare * (L / 50)
  const right: P[] = [[0.01, 0], [wH, 0], [hH, Math.min(18, L * 0.4)], [hem, L], [0.01, L]]
  return { d: poly([...right, ...mirror(right)]), half: hem, bottom: L, top: 0, widthAt: { y: 0, half: wH, label: 'Waist', value: dims.waist } }
}

function dressOutline(dims: FlatDims): Outline {
  const bH = (dims.chest ?? 90) / 4
  const wH = (dims.waist ?? 76) / 4
  const hH = Math.max(wH, (dims.hips ?? 100) / 4)
  const L = dims.length ?? 92
  const waistY = 26
  const right: P[] = [[0.01, 4], [bH * 0.6, 0], [bH, 4], [bH, 12], [wH, waistY], [hH, waistY + 20], [hH + L * 0.12, L], [0.01, L]]
  return { d: poly([...right, ...mirror(right)]), half: hH + L * 0.12, bottom: L, top: -14, widthAt: { y: waistY, half: wH, label: 'Waist', value: dims.waist } }
}

function apronOutline(dims: FlatDims): Outline {
  const W = (dims.width ?? 60) / 2
  const L = dims.length ?? 85
  const right: P[] = [[0.01, 0], [13, 0], [13, 26], [W, 30], [W, L], [0.01, L]]
  return { d: poly([...right, ...mirror(right)]), half: W, bottom: L, top: -16, widthAt: { y: 30, half: W, label: 'Width', value: dims.width } }
}

function bagOutline(dims: FlatDims): Outline {
  const W = (dims.width ?? 34) / 2
  const H = dims.height ?? 36
  const s = dims.strap ?? 0
  const lift = s ? Math.min(s * 0.32, 50) : 0
  let d = poly([[-W, 0], [W, 0], [W, H], [-W, H]])
  if (s) d += ` M${f(-W * 0.45)} 0 C${f(-W * 0.45)} ${f(-lift * 1.3)} ${f(W * 0.45)} ${f(-lift * 1.3)} ${f(W * 0.45)} 0`
  return { d, half: W, bottom: H, top: -lift, widthAt: { y: H * 0.5, half: W, label: 'Width', value: dims.width } }
}

function outlineOf(form: Form, dims: FlatDims, shape: string): Outline | null {
  switch (form) {
    case 'top':
      return topOutline(dims, {})
    case 'outer':
      return topOutline(dims, { outer: true })
    case 'vest':
      return topOutline(dims, { vest: true, outer: true })
    case 'corset':
      return corsetOutline(dims)
    case 'bottom':
      return bottomOutline(dims, false)
    case 'shorts':
      return bottomOutline(dims, true)
    case 'skirt':
      return skirtOutline(dims, shape === 'midiskirt' ? 12 : 4)
    case 'dress':
      return dressOutline(dims)
    case 'apron':
      return apronOutline(dims)
    case 'bag':
      return bagOutline(dims)
    default:
      return null
  }
}

export default function GarmentFlat({ form, dims, base, spec, title }: { form: Form; dims: FlatDims; base?: FlatDims; spec: MockSpec; title: string }) {
  const uid = `flat${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const now = outlineOf(form, dims, spec.shape)
  if (!now) {
    // Small accessories and homeware: the product drawing itself is the clearest preview.
    return <ProductMock {...spec} title={title} className="flat-mock" />
  }
  const was = base ? outlineOf(form, base, spec.shape) : null
  const half = Math.max(now.half, was?.half ?? 0)
  const bottom = Math.max(now.bottom, was?.bottom ?? 0)
  const top = Math.min(now.top, was?.top ?? 0)
  const padX = 20
  const vx = -half - padX
  const vw = (half + padX) * 2 + 10
  const vy = top - 10
  const vh = bottom - top + 26
  const fs = Math.max(3.4, Math.min(vw, vh) / 26)
  const { D } = mockPaint(spec.colour, spec.material)
  const F = `url(#${spec.patch ? `pat${uid}` : `fab${uid}`})`
  const lenX = half + 9
  const lenChanged = was && Math.abs(was.bottom - now.bottom) > 0.05
  const w = now.widthAt

  return (
    <svg className="flat-svg" viewBox={`${f(vx)} ${f(vy)} ${f(vw)} ${f(vh)}`} role="img" aria-label={`2D flat sketch of the ${title}`}>
      <defs>
        <MockDefs uid={uid} material={spec.material} colour={spec.colour} fabScale={0.55} patScale={0.3} />
      </defs>
      {was && <path d={was.d} fill="none" className="flat-ghost" strokeWidth={fs * 0.12} />}
      <path d={now.d} fill={F} fillRule="evenodd" stroke={D} strokeWidth={fs * 0.12} strokeLinejoin="round" className="flat-now" />
      <path d={now.d} fill={`url(#sh${uid})`} fillRule="evenodd" pointerEvents="none" />

      {/* length */}
      <g className="flat-dim" strokeWidth={fs * 0.09}>
        <line x1={lenX} y1={Math.max(0, now.top)} x2={lenX} y2={now.bottom} />
        <line x1={lenX - 1.5} y1={Math.max(0, now.top)} x2={lenX + 1.5} y2={Math.max(0, now.top)} />
        <line x1={lenX - 1.5} y1={now.bottom} x2={lenX + 1.5} y2={now.bottom} />
        {lenChanged && <line className="flat-dim-was" x1={lenX - 3} y1={was!.bottom} x2={lenX + 3} y2={was!.bottom} />}
        <text x={lenX + 2.2} y={(Math.max(0, now.top) + now.bottom) / 2} fontSize={fs} dominantBaseline="middle">
          {dims.length ?? dims.height ?? ''} cm
        </text>
      </g>

      {/* width */}
      {w && w.value !== undefined && (
        <g className="flat-dim" strokeWidth={fs * 0.09}>
          <line x1={-w.half} y1={w.y} x2={w.half} y2={w.y} strokeDasharray={`${fs * 0.5} ${fs * 0.35}`} />
          <text x={0} y={w.y - fs * 0.45} fontSize={fs * 0.9} textAnchor="middle">
            {w.label} {w.value} cm
          </text>
        </g>
      )}

      {now.sleeveEnd && dims.sleeve !== undefined && (
        <text className="flat-note" x={now.sleeveEnd[0] - 1} y={now.sleeveEnd[1] + fs * 1.2} fontSize={fs * 0.85} textAnchor="middle">
          Sleeve {dims.sleeve} cm
        </text>
      )}
      {dims.strap ? (
        <text className="flat-note" x={0} y={now.top + fs * 1.4} fontSize={fs * 0.85} textAnchor="middle">
          Strap {dims.strap} cm
        </text>
      ) : null}
      {was && (
        <text className="flat-legend" x={vx + 3} y={vy + vh - 3} fontSize={fs * 0.8}>
          - - original
        </text>
      )}
    </svg>
  )
}

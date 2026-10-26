import { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCw } from 'lucide-react'
import { bodyOf, type Body, type FitProfile } from '../lib/fit'
import { FORM_OF, type GarmentKind, type TargetForm } from '../lib/studio'
import type { FlatDims } from './GarmentFlat'
import { mockPaint, type MockSpec } from './ProductMock'

/**
 * RE:PLAY+ 3D preview — a stylised, low-poly mannequin built from the wearer's measurements,
 * wearing a mesh of the garment built from its measurements. Rendered on a 2D canvas
 * (perspective projection, painter's algorithm, simple lighting): no 3D library, no server.
 * It communicates fit, proportion, silhouette and length — it is not photorealistic.
 */

type V = [number, number, number]
type Form = TargetForm | GarmentKind

interface Quad {
  p: V[]
  n: V
  c: [number, number, number]
  /** Closed surfaces are culled when facing away; open garment surfaces show their inside */
  closed: boolean
}

const hex = (h: string): [number, number, number] => {
  const m = /^#([0-9a-f]{6})$/i.exec(h)
  if (!m) return [143, 179, 214]
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const mul = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s]
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const len = (a: V) => Math.hypot(a[0], a[1], a[2])
const norm = (a: V): V => {
  const l = len(a) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** Ramanujan's ellipse perimeter */
const perim = (a: number, b: number) => Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)))

const SKIN = '#d9cbbb'
const HAIR = '#2d2825'
const TEE = '#efece6'
const TROUSER = '#3a3f3c'
const SHOE = '#1f2321'

interface Ring {
  c: V
  rx: number
  rz: number
}

class Mesh {
  quads: Quad[] = []

  /** A tube through rings, each with its own centre and radii. Frames follow the path. */
  tube(rings: Ring[], colour: string | ((i: number, j: number, seg: number, centre: V) => string), opts: { seg?: number; closed?: boolean; arc?: [number, number] } = {}) {
    const seg = opts.seg ?? 24
    const [a0, a1] = opts.arc ?? [0, Math.PI * 2]
    const full = !opts.arc
    const cols = full ? seg : seg + 1
    const pts: V[][] = rings.map((r, i) => {
      const prev = rings[Math.max(0, i - 1)].c
      const next = rings[Math.min(rings.length - 1, i + 1)].c
      const t = norm(sub(next, prev))
      const ref: V = Math.abs(t[2]) > 0.9 ? [0, 1, 0] : [0, 0, 1]
      const n = norm(cross(ref, t))
      const b = norm(cross(t, n))
      return Array.from({ length: cols }, (_, j) => {
        const th = a0 + ((a1 - a0) * j) / seg
        return add(r.c, add(mul(n, Math.cos(th) * r.rx), mul(b, Math.sin(th) * r.rz)))
      })
    })
    for (let i = 0; i < rings.length - 1; i++) {
      for (let j = 0; j < seg; j++) {
        const j2 = full ? (j + 1) % seg : j + 1
        const p = [pts[i][j], pts[i][j2], pts[i + 1][j2], pts[i + 1][j]]
        const centre = mul(add(add(p[0], p[1]), add(p[2], p[3])), 0.25)
        const axis = mul(add(rings[i].c, rings[i + 1].c), 0.5)
        const n = norm(sub(centre, axis))
        const col = typeof colour === 'string' ? colour : colour(i, j, seg, centre)
        this.quads.push({ p, n, c: hex(col), closed: opts.closed ?? true })
      }
    }
  }

  ellipsoid(c: V, r: V, colour: string | ((i: number, j: number, seg: number, centre: V) => string), stacks = 10) {
    const rings: Ring[] = Array.from({ length: stacks + 1 }, (_, i) => {
      const phi = (Math.PI * i) / stacks
      return { c: [c[0], c[1] + Math.cos(phi) * r[1], c[2]] as V, rx: Math.max(0.01, Math.sin(phi) * r[0]), rz: Math.max(0.01, Math.sin(phi) * r[2]) }
    })
    this.tube(rings, colour, { seg: 16 })
  }

  box(c: V, w: number, h: number, d: number, colour: string) {
    const [x, y, z] = c
    const X = [x - w / 2, x + w / 2]
    const Y = [y - h / 2, y + h / 2]
    const Z = [z - d / 2, z + d / 2]
    const face = (p: V[], n: V) => this.quads.push({ p, n, c: hex(colour), closed: true })
    face([[X[0], Y[0], Z[1]], [X[1], Y[0], Z[1]], [X[1], Y[1], Z[1]], [X[0], Y[1], Z[1]]], [0, 0, 1])
    face([[X[1], Y[0], Z[0]], [X[0], Y[0], Z[0]], [X[0], Y[1], Z[0]], [X[1], Y[1], Z[0]]], [0, 0, -1])
    face([[X[1], Y[0], Z[1]], [X[1], Y[0], Z[0]], [X[1], Y[1], Z[0]], [X[1], Y[1], Z[1]]], [1, 0, 0])
    face([[X[0], Y[0], Z[0]], [X[0], Y[0], Z[1]], [X[0], Y[1], Z[1]], [X[0], Y[1], Z[0]]], [-1, 0, 0])
    face([[X[0], Y[1], Z[1]], [X[1], Y[1], Z[1]], [X[1], Y[1], Z[0]], [X[0], Y[1], Z[0]]], [0, 1, 0])
  }
}

/* ---------------- body geometry (world: y up from the floor, cm) ---------------- */

function torsoRing(b: Body, y: number): Ring {
  // y measured from the top of the head (as in bodyOf), returned in world coordinates.
  const Y = b.H - y
  if (y < b.shoulderY - 2.5) return { c: [0, Y, 0], rx: b.neckW / 2, rz: b.neckW * 0.46 }
  const w = b.tw(y)
  const k = y < b.armpitY ? lerp(0.42, 0.62, (y - b.shoulderY) / (b.armpitY - b.shoulderY)) : y < b.bustY ? 0.66 : y < b.waistY ? lerp(0.66, 0.74, (y - b.bustY) / (b.waistY - b.bustY)) : 0.74
  return { c: [0, Y, 0], rx: w, rz: Math.max(3, w * k) }
}

/** Below the crotch, a garment hangs around both legs. */
function legsBound(b: Body, y: number): Ring {
  const t = Math.min(1, Math.max(0, (y - b.crotchY) / (b.kneeY - b.crotchY)))
  const lx = lerp(b.legX[0], b.legX[1], t)
  const lw = lerp(b.legW[0], b.legW[1], t) / 2
  return { c: [0, b.H - y, 0], rx: lx + lw, rz: lw * 1.05 }
}

const ringAt = (b: Body, y: number) => (y <= b.crotchY ? torsoRing(b, y) : legsBound(b, y))

function armPath(b: Body, side: 1 | -1, from = 0, to = 1): V[] {
  const pts = b.arm.map(([x, y]): V => [side * x, b.H - y, 0])
  const segs = [len(sub(pts[1], pts[0])), len(sub(pts[2], pts[1]))]
  const total = segs[0] + segs[1]
  const at = (t: number): V => {
    const d = t * total
    return d <= segs[0] ? add(pts[0], mul(sub(pts[1], pts[0]), d / segs[0])) : add(pts[1], mul(sub(pts[2], pts[1]), (d - segs[0]) / segs[1]))
  }
  const n = 8
  return Array.from({ length: n + 1 }, (_, i) => at(from + ((to - from) * i) / n))
}
const armLength = (b: Body) => {
  const [a, e, w] = b.arm
  return Math.hypot(e[0] - a[0], e[1] - a[1]) + Math.hypot(w[0] - e[0], w[1] - e[1])
}
const armR = (b: Body, t: number) => b.armW * lerp(0.5, 0.27, t)

function legPath(b: Body, side: 1 | -1, y0: number, y1: number): { c: V; r: number }[] {
  const n = 10
  return Array.from({ length: n + 1 }, (_, i) => {
    const y = lerp(y0, y1, i / n)
    const t1 = Math.min(1, Math.max(0, (y - b.crotchY) / (b.kneeY - b.crotchY)))
    const t2 = Math.min(1, Math.max(0, (y - b.kneeY) / (b.ankleY - b.kneeY)))
    const x = y <= b.kneeY ? lerp(b.legX[0], b.legX[1], t1) : lerp(b.legX[1], b.legX[2], t2)
    const w = y <= b.kneeY ? lerp(b.legW[0], b.legW[1], t1) : lerp(b.legW[1], b.legW[2], t2)
    return { c: [side * x, b.H - y, 0] as V, r: w / 2 }
  })
}

/* ---------------- scene ---------------- */

function buildScene(profile: FitProfile, form: Form, dims: FlatDims, spec: MockSpec, placket: boolean): Quad[] {
  const b = bodyOf(profile)
  const m = new Mesh()
  const { base, D } = mockPaint(spec.colour, spec.material)
  const fab = base
  const trim = D
  const wearsBottom = form === 'bottom' || form === 'shorts' || form === 'skirt' || form === 'dress'
  const wearsTop = form === 'top' || form === 'outer' || form === 'vest' || form === 'corset' || form === 'dress'

  // Mannequin: head with hair at the back, torso, arms, legs, hands and shoes.
  const headC: V = [0, b.H - b.headH / 2, 0]
  m.ellipsoid(headC, [b.headW / 2, b.headH / 2, (b.headW / 2) * 1.08], (i, _j, _s, c) => (c[2] < (b.headW / 2) * 0.25 || i <= 2 ? HAIR : SKIN), 12)
  m.ellipsoid([0, b.H - b.headH * 0.55, (b.headW / 2) * 1.02], [0.9, 1.6, 1], SKIN, 4)
  const torso: Ring[] = []
  for (let y = b.headH * 0.85; y <= b.crotchY + 0.01; y += 2.4) torso.push(torsoRing(b, y))
  m.tube(torso, SKIN, { seg: 24 })
  ;([1, -1] as const).forEach((s) => {
    const arm = armPath(b, s)
    m.tube(arm.map((c, i) => ({ c, rx: armR(b, i / (arm.length - 1)), rz: armR(b, i / (arm.length - 1)) })), SKIN, { seg: 12 })
    const w = arm[arm.length - 1]
    m.ellipsoid([w[0], w[1] - b.H * 0.03, w[2]], [2.6, b.H * 0.032, 1.6], SKIN, 6)
    const leg = legPath(b, s, b.hipY - 6, b.ankleY)
    m.tube(leg.map((l) => ({ c: l.c, rx: l.r, rz: l.r * 0.95 })), SKIN, { seg: 14 })
    m.box([s * b.legX[2], (b.H - b.ankleY) / 2, 3.5], 8, b.H - b.ankleY + 1, 22, SHOE)
  })

  // Neutral base outfit where the garment doesn't cover.
  if (!wearsBottom) {
    const hips: Ring[] = []
    for (let y = b.waistY + 1; y <= b.crotchY; y += 2.4) {
      const r = torsoRing(b, y)
      hips.push({ ...r, rx: r.rx * 1.05 + 0.4, rz: r.rz * 1.05 + 0.4 })
    }
    m.tube(hips, TROUSER, { seg: 24 })
    ;([1, -1] as const).forEach((s) => m.tube(legPath(b, s, b.crotchY - 3, b.ankleY - 1).map((l) => ({ c: l.c, rx: l.r * 1.18 + 0.6, rz: l.r * 1.12 + 0.6 })), TROUSER, { seg: 14 }))
  }
  if (!wearsTop || form === 'vest' || form === 'corset') {
    const tee: Ring[] = []
    // Tucked in above a worn waistband so the two surfaces never overlap.
    const teeEnd = wearsBottom ? b.waistY + 0.5 : b.hipY - 2
    for (let y = b.shoulderY + 0.5; y <= teeEnd; y += 2.4) {
      const r = torsoRing(b, y)
      tee.push({ ...r, rx: r.rx * 1.03 + 0.3, rz: r.rz * 1.03 + 0.3 })
    }
    m.tube(tee, TEE, { seg: 24 })
    if (form !== 'vest') ([1, -1] as const).forEach((s) => m.tube(armPath(b, s, 0, 0.3).map((c, i) => ({ c, rx: armR(b, i * 0.03) * 1.3, rz: armR(b, i * 0.03) * 1.3 })), TEE, { seg: 12 }))
  }

  /** Garment rings from y0 to y1 (from the head top), circumference C(y), with a darker hem band. */
  const garment = (y0: number, y1: number, C: (y: number) => number, opts: { front?: boolean; placket?: boolean; minScale?: number } = {}) => {
    const rings: Ring[] = []
    const step = 2.2
    const ys: number[] = []
    for (let y = y0; y < y1 - 1.6; y += step) ys.push(y)
    ys.push(y1 - 1.6, y1)
    for (const y of ys) {
      const r = ringAt(b, y)
      const s = Math.max(opts.minScale ?? 1.04, C(y) / perim(r.rx, r.rz))
      rings.push({ c: r.c, rx: r.rx * s + 0.3, rz: r.rz * s + 0.3 })
    }
    const last = rings.length - 2
    m.tube(rings, (i, j, seg) => (i >= last ? trim : opts.placket && (j === Math.floor(seg / 4) || j === Math.floor(seg / 4) - 1) && i % 4 !== 0 ? trim : fab), {
      seg: 28,
      closed: false,
      arc: opts.front ? [-Math.PI * 0.08, Math.PI * 1.08] : undefined,
    })
  }
  const piece = (from: number, to: number, a: number, bb: number, y: number) => lerp(a, bb, Math.min(1, Math.max(0, (y - from) / Math.max(1, to - from))))

  switch (form) {
    case 'top':
    case 'outer':
    case 'vest': {
      const chest = dims.chest ?? 100
      const waist = dims.waist ?? chest * 0.95
      const y0 = b.shoulderY - 2
      const y1 = y0 + (dims.length ?? 66)
      garment(y0, y1, (y) => (y < b.bustY ? chest * 0.96 : y < b.waistY ? piece(b.bustY, b.waistY, chest, waist, y) : Math.max(waist, chest * 0.9)), { placket: placket || form !== 'top' })
      const sleeve = form === 'vest' ? 0 : dims.sleeve ?? 0
      if (sleeve > 0) {
        const t = Math.min(1, sleeve / armLength(b))
        const ease = 1.25 + Math.max(0, chest / profile.bust - 1.1) * 0.9
        ;([1, -1] as const).forEach((s) => {
          const path = armPath(b, s, 0, t)
          m.tube(
            path.map((c, i) => ({ c, rx: armR(b, (i / 8) * t) * ease + 0.5, rz: armR(b, (i / 8) * t) * ease + 0.5 })),
            (i) => (i >= path.length - 2 ? trim : fab),
            { seg: 14, closed: false },
          )
        })
      }
      break
    }
    case 'corset': {
      const y0 = b.bustY - 4
      garment(y0, y0 + (dims.length ?? 34), (y) => (y < b.bustY ? (dims.chest ?? profile.bust) * 0.98 : piece(b.bustY, b.waistY, dims.chest ?? profile.bust, dims.waist ?? profile.waist, y)), { placket: true, minScale: 1.01 })
      break
    }
    case 'dress': {
      const y0 = b.bustY - 7
      const y1 = y0 + (dims.length ?? 92)
      const bust = dims.chest ?? profile.bust + 6
      const waist = dims.waist ?? profile.waist + 6
      const hips = Math.max(dims.hips ?? 0, profile.hips + 8)
      garment(y0, y1, (y) => (y < b.bustY ? bust : y < b.waistY ? piece(b.bustY, b.waistY, bust, waist, y) : y < b.hipY ? piece(b.waistY, b.hipY, waist, hips, y) : hips + (y - b.hipY) * 0.5))
      break
    }
    case 'skirt': {
      const y0 = b.waistY
      const y1 = y0 + (dims.length ?? 45)
      const waist = dims.waist ?? profile.waist + 2
      const hips = dims.hips ?? profile.hips + 6
      const flare = spec.shape === 'midiskirt' ? 0.9 : 0.35
      garment(y0, y1, (y) => (y < b.hipY ? piece(b.waistY, b.hipY, waist, hips, y) : hips + (y - b.hipY) * flare), { minScale: 1.02 })
      break
    }
    case 'bottom':
    case 'shorts': {
      const waist = dims.waist ?? profile.waist + 2
      const hips = dims.hips ?? profile.hips + 6
      const y0 = b.waistY + 1
      const rise = b.crotchY - y0
      const legLen = Math.max(2, (dims.length ?? 100) - rise)
      garment(y0, b.crotchY + 2, (y) => piece(y0, b.hipY, waist, hips, y), { minScale: 1.06 })
      const legOpen = dims.leg ?? (form === 'shorts' ? hips * 0.34 : 40)
      const thigh = hips * 0.55
      ;([1, -1] as const).forEach((s) => {
        const path = legPath(b, s, b.crotchY + 1, Math.min(b.ankleY + 2, b.crotchY + legLen))
        m.tube(
          path.map((l, i) => {
            const C = lerp(thigh, legOpen, i / (path.length - 1))
            const r = Math.max(l.r * 1.06 + 0.4, C / (2 * Math.PI))
            return { c: l.c, rx: r, rz: r * 0.96 }
          }),
          (i) => (i >= path.length - 2 ? trim : fab),
          { seg: 16, closed: false },
        )
      })
      break
    }
    case 'apron': {
      const y0 = b.bustY - 8
      garment(y0, y0 + (dims.length ?? 85), (y) => perim(ringAt(b, y).rx, ringAt(b, y).rz) * 1.08, { front: true })
      break
    }
    case 'bag': {
      const w = dims.width ?? 30
      const h = dims.height ?? 30
      const strap = dims.strap ?? 0
      const d = spec.shape === 'wallet' || spec.shape === 'sleeve' ? 2.5 : 8
      if (strap >= 100) {
        // Crossbody: bag at the left hip, strap across the chest to the right shoulder.
        const hipR = torsoRing(b, b.hipY - 6)
        const bag: V = [-hipR.rx * 0.55, b.H - (b.hipY - 6), hipR.rz + d / 2 + 0.6]
        m.box(bag, w, h, d, fab)
        const pts: V[] = []
        for (let i = 0; i <= 10; i++) {
          const t = i / 10
          const y = lerp(b.hipY - 6 - h / 2, b.shoulderY - 1, t)
          const x = lerp(bag[0], b.shoulderHalf * 0.55, t)
          const r = torsoRing(b, y)
          const z = r.rz * Math.sqrt(Math.max(0, 1 - Math.min(1, (x / r.rx) ** 2))) + 1.4
          pts.push([x, b.H - y, z])
        }
        m.tube(pts.map((c) => ({ c, rx: 1.6, rz: 0.4 })), trim, { seg: 6 })
      } else if (strap >= 40) {
        // Shoulder bag hanging at the right side.
        const topY = b.shoulderY + strap * 0.42
        const r = torsoRing(b, Math.min(topY + h / 2, b.crotchY))
        const c: V = [r.rx + 2 + d / 2, b.H - topY - h / 2, 0]
        m.box(c, d, h, w, fab)
        m.tube([{ c: [c[0], c[1] + h / 2, 0], rx: 0.6, rz: 1.4 }, { c: [b.shoulderHalf - 2, b.H - b.shoulderY + 1.5, 0], rx: 0.6, rz: 1.4 }], trim, { seg: 6 })
      } else {
        // Carried in the right hand.
        const wr = b.arm[2]
        const c: V = [wr[0] + 1, b.H - wr[1] - b.H * 0.03 - h / 2 - (strap ? 6 : 0), 0]
        m.box(c, d, h, w, fab)
        if (strap) m.tube([{ c: [c[0], c[1] + h / 2, -w * 0.25], rx: 0.6, rz: 0.6 }, { c: [c[0], c[1] + h / 2 + 7, 0], rx: 0.6, rz: 0.6 }, { c: [c[0], c[1] + h / 2, w * 0.25], rx: 0.6, rz: 0.6 }], trim, { seg: 6 })
      }
      break
    }
    default: {
      // Accessories and homeware.
      const shape = spec.shape
      if (shape === 'buckethat') {
        const top = b.H
        const r = b.headW / 2 + 1
        m.tube(
          [
            { c: [0, top + 1, 0], rx: 0.1, rz: 0.1 },
            { c: [0, top + 0.5, 0], rx: r * 0.85, rz: r * 0.9 },
            { c: [0, top - b.headH * 0.32, 0], rx: r * 1.05, rz: r * 1.1 },
            { c: [0, top - b.headH * 0.4, 0], rx: r + (dims.width ?? 6), rz: r * 1.1 + (dims.width ?? 6) },
          ],
          fab,
          { seg: 24 },
        )
      } else if (shape === 'headband') {
        const r = b.headW / 2 + 0.4
        m.tube([{ c: [0, b.H - b.headH * 0.12, -0.5], rx: r, rz: r * 1.1 }, { c: [0, b.H - b.headH * 0.12 - 4, -0.5], rx: r, rz: r * 1.1 }], fab, { seg: 20, closed: false })
      } else if (shape === 'bandana' || shape === 'lanyard') {
        const y = b.shoulderY - 3
        m.tube([{ c: [0, b.H - y + 2, 0], rx: b.neckW / 2 + 1, rz: b.neckW / 2 + 0.6 }, { c: [0, b.H - y - 4, 1.4], rx: b.neckW / 2 + 3, rz: b.neckW / 2 + 2 }], fab, { seg: 18, closed: false })
      } else if (shape === 'scrunchie') {
        const wr = b.arm[2]
        m.tube([{ c: [wr[0], b.H - wr[1] + 2, 0], rx: 3.4, rz: 3.4 }, { c: [wr[0], b.H - wr[1], 0], rx: 3.6, rz: 3.6 }], fab, { seg: 16 })
      } else {
        // Not worn: shown held in front of the body, to scale.
        const w = dims.width ?? dims.diameter ?? 14
        const h = dims.height ?? dims.diameter ?? 14
        const r = torsoRing(b, b.waistY)
        m.box([0, b.H - b.waistY, r.rz + 7], w, h, shape === 'cushion' ? 12 : 3, fab)
      }
    }
  }
  return m.quads
}

/* ---------------- rendering ---------------- */

function draw(ctx: CanvasRenderingContext2D, quads: Quad[], w: number, h: number, H: number, yaw: number, pitch: number) {
  ctx.clearRect(0, 0, w, h)
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const cp = Math.cos(pitch)
  const sp = Math.sin(pitch)
  const midY = H / 2
  const k = (h * 0.86) / Math.max(H + 18, 150)
  const dist = 420
  const rot = (v: V): V => {
    const x = v[0] * cy + v[2] * sy
    const z = -v[0] * sy + v[2] * cy
    const y = v[1] - midY
    return [x, y * cp - z * sp, y * sp + z * cp]
  }
  const L = norm([-0.45, 0.6, 0.75])
  const origin = rot([0, 0, 0])
  const items: { d: number; pts: [number, number][]; col: string }[] = []
  for (const q of quads) {
    // Normals rotate without the vertical re-centring.
    const nv = norm(sub(rot(q.n), origin))
    const facing = nv[2]
    if (q.closed && facing < -0.05) continue
    const rp = q.p.map(rot)
    let depth = 0
    const pts = rp.map(([x, y, z]): [number, number] => {
      depth += z
      const s = dist / (dist - z)
      return [w / 2 + x * s * k, h * 0.53 - y * s * k]
    })
    const inside = facing < 0
    const lit = inside ? 0.38 : 0.45 + 0.55 * Math.max(0, nv[0] * L[0] + nv[1] * L[1] + nv[2] * L[2])
    const [r, g, bl] = q.c
    items.push({ d: depth / 4, pts, col: `rgb(${Math.round(r * lit)},${Math.round(g * lit)},${Math.round(bl * lit)})` })
  }
  items.sort((a, b) => a.d - b.d)
  ctx.lineJoin = 'round'
  ctx.lineWidth = 0.7
  for (const it of items) {
    ctx.beginPath()
    ctx.moveTo(it.pts[0][0], it.pts[0][1])
    for (let i = 1; i < it.pts.length; i++) ctx.lineTo(it.pts[i][0], it.pts[i][1])
    ctx.closePath()
    ctx.fillStyle = it.col
    ctx.strokeStyle = it.col
    ctx.fill()
    ctx.stroke()
  }
  // Floor shadow.
  ctx.save()
  ctx.globalCompositeOperation = 'destination-over'
  const fy = h * 0.53 + midY * k * cp
  const g = ctx.createRadialGradient(w / 2, fy, 2, w / 2, fy, w * 0.22)
  g.addColorStop(0, 'rgba(0,0,0,0.18)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(w / 2, fy, w * 0.22, w * 0.045, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const VIEWS: { label: string; yaw: number }[] = [
  { label: 'Front', yaw: 0 },
  { label: 'Side', yaw: Math.PI / 2 },
  { label: 'Back', yaw: Math.PI },
]

export default function Garment3D({ body, form, dims, spec, placket = false, title }: { body: FitProfile; form?: Form; dims: FlatDims; spec: MockSpec; placket?: boolean; title: string }) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: 300, h: 420 })
  const [yaw, setYaw] = useState(-0.45)
  const [spinning, setSpinning] = useState(false)
  const drag = useRef<{ x: number; yaw: number } | null>(null)
  const f = form ?? FORM_OF[spec.shape]
  const quads = useMemo(() => buildScene(body, f, dims, spec, placket), [body, f, dims, spec, placket])

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const w = Math.max(160, Math.round(e.contentRect.width))
      setSize({ w, h: Math.round(w * 1.3) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const c = canvas.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = size.w * dpr
    c.height = size.h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    draw(ctx, quads, size.w, size.h, body.height, yaw, -0.12)
  }, [quads, size, yaw, body.height])

  useEffect(() => {
    if (!spinning) return
    let raf = 0
    let last = performance.now()
    const tick = (t: number) => {
      setYaw((y) => y + (t - last) * 0.0011)
      last = t
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [spinning])

  return (
    <div className="g3d">
      <div
        ref={wrap}
        className="g3d-stage"
        onPointerDown={(e) => {
          setSpinning(false)
          drag.current = { x: e.clientX, yaw }
          ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (drag.current) setYaw(drag.current.yaw + (e.clientX - drag.current.x) * 0.012)
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <canvas ref={canvas} style={{ width: size.w, height: size.h }} role="img" aria-label={`3D preview of the ${title} on a ${body.height} cm model. Drag to rotate.`} />
        <span className="g3d-hint tiny">Drag to rotate</span>
      </div>
      <div className="row wrap g3d-controls" style={{ gap: 6 }}>
        {VIEWS.map((v) => (
          <button key={v.label} type="button" className="chip" onClick={() => { setSpinning(false); setYaw(v.yaw) }}>
            {v.label}
          </button>
        ))}
        <button type="button" className={`chip ${spinning ? 'on' : ''}`} onClick={() => setSpinning((s) => !s)} aria-pressed={spinning}>
          <RotateCw size={12} /> {spinning ? 'Stop' : 'Spin'}
        </button>
      </div>
    </div>
  )
}

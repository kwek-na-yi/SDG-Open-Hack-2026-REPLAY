import { useId, type ReactNode } from 'react'
import { bodyOf, garmentSpan, zoneOf, type Body, type FitProfile } from '../../lib/fit'
import { MockArt, MockDefs, type MockSpec, type Shape } from '../product/ProductMock'
import { mockPaint } from '../../lib/colour'

/**
 * AI Fit Preview model — a studio mannequin drawn from the user's measurements
 * (in cm), wearing the transformed item in its real fabric and colour.
 * Pure SVG, so it renders instantly and offline.
 */

type P = [number, number]

const VW = 260
const VH = 440
const FLOOR = 422
const K = 390 / 210 // px per cm — a 210 cm model just fits, so heights compare honestly
const CX = 138

const SKIN = '#d9cbbb'
const SKIN_D = '#b9a896'
const HAIR = '#2d2825'
const TEE_LIGHT = ['#f3f1ec', '#d6d1c6']
const TEE_DARK = ['#4a4f4c', '#323634'] // under very light items, so they still stand out
const TROUSER = '#3a3f3c'
const TROUSER_D = '#252927'
const SHOE = '#1f2321'
const CORD = '#ebe5d6'
const GOLD = '#c9a14a'

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}
const f = (n: number) => Math.round(n * 100) / 100
const pt = (p: P) => `${f(p[0])} ${f(p[1])}`
const mirror = (ps: P[]): P[] => ps.map(([x, y]) => [-x, y])

/** Smooth Catmull-Rom curve through points, as cubic Béziers. */
function curve(ps: P[], move = true) {
  let d = `${move ? 'M' : 'L'}${pt(ps[0])}`
  for (let i = 0; i < ps.length - 1; i++) {
    const p0 = ps[i - 1] ?? ps[i]
    const p1 = ps[i]
    const p2 = ps[i + 1]
    const p3 = ps[i + 2] ?? p2
    d += ` C${pt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${pt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${pt(p2)}`
  }
  return d
}

/** A left-right symmetric shape from its left edge (top → bottom). Optional control points curve the hem and the top. */
function sym(left: P[], hem?: P, top?: P) {
  const right = mirror(left).reverse()
  let d = curve(left)
  d += hem ? ` Q${pt(hem)} ${pt(right[0])}` : ` L${pt(right[0])}`
  d += ' ' + tail(right)
  return d + (top ? ` Q${pt(top)} ${pt(left[0])} Z` : ' Z')
}

/** A curve continuing from its first point (which the path is already at). */
const tail = (ps: P[]) => curve(ps, false).replace(/^L[^C]*/, '')

/** Arm centreline x and half-width at height y (right arm; negate x for the left). */
function armAt(b: Body, y: number) {
  const [[sx, sy], [ex, ey], [wx, wy]] = b.arm
  const widths = [b.armW * 0.5, b.armW * 0.36, b.armW * 0.27]
  if (y <= ey) {
    const t = Math.max(0, (y - sy) / (ey - sy))
    return { x: sx + (ex - sx) * t, w: widths[0] + (widths[1] - widths[0]) * t }
  }
  const t = Math.min(1, (y - ey) / (wy - ey))
  return { x: ex + (wx - ex) * t, w: widths[1] + (widths[2] - widths[1]) * t }
}

/** Right-arm outline from y0 down to y1, `grow` cm wider than the arm (for sleeves). */
function armShape(b: Body, y0: number, y1: number, grow = 0, cap = true) {
  const ys = [y0, (y0 + b.waistY) / 2, b.waistY, (b.waistY + y1) / 2, y1].filter((y, i, a) => y >= y0 && y <= y1 && a.indexOf(y) === i).sort((m, n) => m - n)
  const outer: P[] = ys.map((y) => {
    const a = armAt(b, y)
    return [a.x + a.w + grow, y]
  })
  const inner: P[] = ys
    .map((y): P => {
      const a = armAt(b, y)
      return [a.x - a.w - grow, y]
    })
    .reverse()
  // Rounded deltoid: from the shoulder joint, over the cap, into the upper arm.
  const [sx] = b.arm[0]
  const capPts: P[] = [
    [sx - b.armW * 0.2, b.shoulderY - 0.4 - grow * 0.4],
    [b.shoulderHalf - 0.6 + grow, b.shoulderY + 2.2],
    [b.shoulderHalf - 0.2 + grow, b.shoulderY + 5.5],
  ]
  const rest = cap ? outer.filter(([, y]) => y > b.shoulderY + 9) : outer
  return `${curve(cap ? [...capPts, ...rest] : outer)} L${pt(inner[0])} ${tail(inner)} Z`
}

const flip = (d: ReactNode, key: string) => (
  <g key={key} transform="scale(-1 1)">
    {d}
  </g>
)

/** Places a 200×200 product drawing so mock point `anchor` lands on body point `at`, `width` cm wide over `span` mock units. */
function Placed({ spec, anchor, at, width, span, noBack, uid }: { spec: MockSpec; anchor: P; at: P; width: number; span: number; noBack?: boolean; uid: string }) {
  const s = width / span
  // Keep the weave about as fine as on the product cards.
  const fabScale = 1.3 / (s * K)
  return (
    <g transform={`translate(${f(at[0])} ${f(at[1])}) scale(${f(s)}) translate(${-anchor[0]} ${-anchor[1]})`}>
      <defs>
        <MockDefs uid={uid} material={spec.material} colour={spec.colour} fabScale={fabScale} patScale={fabScale * 0.6} />
      </defs>
      <MockArt uid={uid} {...spec} noBack={noBack} />
    </g>
  )
}

/** Hand-held items: mock grip point, real width (cm), and width of the drawing in mock units. */
const HELD: Partial<Record<Shape, { grip: P; width: number; span: number }>> = {
  tote: { grip: [100, 34], width: 36, span: 114 },
  shoulder: { grip: [100, 40], width: 27, span: 108 },
  bucketbag: { grip: [100, 30], width: 25, span: 100 },
  drawstring: { grip: [100, 66], width: 28, span: 108 },
  pouch: { grip: [100, 104], width: 19, span: 120 },
  wallet: { grip: [100, 84], width: 11, span: 112 },
  keychain: { grip: [100, 32], width: 4.5, span: 60 },
  sleeve: { grip: [100, 74], width: 36, span: 148 },
}

export default function FitModel({ profile, spec, showMeasures = true }: { profile: FitProfile; spec: MockSpec; showMeasures?: boolean }) {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, '')
  const uid = `fit${raw}`
  const b = bodyOf(profile)
  const { H } = b
  const zone = zoneOf(spec.shape)
  const top = FLOOR - H * K
  const { base, D, T } = mockPaint(spec.colour, spec.material)
  const [TEE, TEE_D] = luminance(base) > 0.8 ? TEE_DARK : TEE_LIGHT
  const F = `url(#${spec.patch ? `pat${uid}` : `fab${uid}`})`
  const shade = `url(#sh${uid})`
  const skin = `url(#skin${uid})`
  const st = (d: string, key: string) => <path key={key} d={d} fill="none" stroke={T} strokeWidth={0.32} strokeDasharray="1.1 0.9" strokeLinecap="round" />
  const piece = (d: string, key: string, fill = F, stroke = D) => (
    <g key={key}>
      <path d={d} fill={fill} stroke={stroke} strokeWidth={0.35} strokeLinejoin="round" />
      <path d={d} fill={shade} />
    </g>
  )
  const hw = b.headW / 2

  /* ---------------- body ---------------- */
  const torso = sym(
    [
      [-b.neckW / 2, b.headH * 0.8],
      [-b.neckW / 2, b.shoulderY - 2.4],
      [-(b.neckW / 2 + 3.2), b.shoulderY - 1.2],
      [-(b.shoulderHalf - 0.8), b.shoulderY + 3.2],
      [-(b.bustHalf + 0.6), b.armpitY],
      [-b.bustHalf, b.bustY],
      [-b.waistHalf, b.waistY],
      [-b.hipHalf, b.hipY],
      [-b.hipHalf * 0.98, b.crotchY],
    ],
    [0, b.crotchY + 1.5],
  )
  const calfY = (b.kneeY + b.ankleY) / 2 - 5
  const legOuter: P[] = [
    [b.hipHalf * 0.99, b.hipY],
    [b.legX[1] + b.legW[1] / 2 + 0.6, b.kneeY - 8],
    [b.legX[1] + b.legW[1] / 2, b.kneeY],
    [b.legX[1] + b.legW[1] * 0.46, calfY],
    [b.legX[2] + b.legW[2] / 2, b.ankleY],
  ]
  const legInner: P[] = [
    [b.legX[2] - b.legW[2] / 2, b.ankleY],
    [b.legX[1] - b.legW[1] * 0.4, calfY],
    [b.legX[1] - b.legW[1] / 2, b.kneeY],
    [0.5, b.crotchY + 0.5],
  ]
  const leg = `${curve(legOuter)} L${pt(legInner[0])} ${tail(legInner)} Z`
  const ax = b.legX[2]
  const foot = `M${pt([ax - 3.6, b.ankleY - 1.5])} L${pt([ax + 3.6, b.ankleY - 1.5])} Q${pt([ax + 5.6, H - 1])} ${pt([ax + 4.4, H])} L${pt([ax - 4.2, H])} Q${pt([ax - 5.4, H - 1])} ${pt([ax - 3.6, b.ankleY - 1.5])} Z`
  const handY = b.arm[2][1] + H * 0.03
  const handX = b.arm[2][0] + 0.3

  /* ---------------- base outfit (neutral, so the item stands out) ---------------- */
  // Neutral tee + trousers fill in whatever the item doesn't cover.
  const showTrousers = zone !== 'bottom' && zone !== 'dress'
  const showTee = spec.shape !== 'croptop'
  const showTeeSleeves = showTee && spec.shape !== 'jacket'
  const teeHem = b.hipY - H * 0.015
  const tee = sym(
    [
      [-(b.neckW / 2 + 1.1), b.shoulderY - 1.9],
      [-(b.shoulderHalf - 0.2), b.shoulderY + 3],
      [-(b.bustHalf + 1.3), b.armpitY + 1],
      [-(b.bustHalf + 1.1), b.bustY],
      [-(b.waistHalf + 1.6), b.waistY],
      [-(b.tw(teeHem) + 1.4), teeHem],
    ],
    [0, teeHem + 0.8],
    [0, b.shoulderY + 2.2],
  )
  const teeSleeve = armShape(b, b.shoulderY + 1.5, b.armpitY + H * 0.055, 1)
  const trouserTop = b.waistY + H * 0.01
  const trouserOuter: P[] = [
    [-(b.tw(trouserTop) + 0.7), trouserTop],
    [-(b.hipHalf + 1), b.hipY],
    [-(b.legX[1] + b.legW[1] / 2 + 1.8), b.kneeY],
    [-(b.legX[2] + b.legW[2] / 2 + 2.6), b.ankleY - 0.5],
  ]
  const trouserInner: P[] = [
    [-(b.legX[2] - b.legW[2] / 2 - 1.6), b.ankleY - 0.5],
    [-(b.legX[1] - b.legW[1] / 2 - 1.2), b.kneeY],
    [0, b.crotchY + 1.5],
  ]
  const trousers =
    `${curve(trouserOuter)} L${pt(trouserInner[0])} ${tail(trouserInner)}` +
    ` ${tail(mirror(trouserInner).reverse())} L${pt(mirror(trouserOuter)[3])} ${tail(mirror(trouserOuter).reverse())} Z`

  /* ---------------- the transformed item ---------------- */
  const span = garmentSpan(spec.shape, b)
  const under: ReactNode[] = [] // drawn under the arms
  const over: ReactNode[] = [] // sleeves, drawn over the arms
  const extras: ReactNode[] = [] // accessories, before hands
  let shoes: ReactNode = null

  if (span) {
    const { top: t0, hem } = span
    switch (spec.shape) {
      case 'miniskirt':
      case 'midiskirt': {
        const midi = spec.shape === 'midiskirt'
        const left: P[] = midi
          ? [
              [-(b.tw(t0) + 0.8), t0],
              [-(b.hipHalf + 1.5), b.hipY],
              [-(b.hipHalf + 4.5), b.kneeY - 2],
              [-(b.hipHalf + 8), hem],
            ]
          : [
              [-(b.tw(t0) + 0.8), t0],
              [-(b.hipHalf + 1.3), b.hipY],
              [-(b.hipHalf + 3.4), hem],
            ]
        under.push(piece(sym(left, [0, hem + 2.2]), 'sk'))
        const bandB = t0 + 3.4
        under.push(piece(sym([[-(b.tw(t0) + 0.9), t0], [-(b.tw(bandB) + 1), bandB]]), 'band'))
        under.push(<path key="bands" d={sym([[-(b.tw(t0) + 0.9), t0], [-(b.tw(bandB) + 1), bandB]])} fill="#000" opacity={0.12} />)
        under.push(<circle key="btn" cx={0} cy={t0 + 1.7} r={0.9} fill={GOLD} />)
        if (midi) {
          ;[-0.55, -0.2, 0.2, 0.55].forEach((r, i) =>
            under.push(<path key={`pl${i}`} d={`M${f(r * b.tw(bandB) * 1.6)} ${f(bandB)} L${f(r * (b.hipHalf + 8) * 1.7)} ${f(hem + 1)}`} stroke={D} strokeWidth={0.3} opacity={0.4} />),
          )
        } else under.push(st(`M0 ${f(bandB)} L0 ${f(hem + 1.8)}`, 'cs'))
        under.push(st(`M${f(left[left.length - 1][0] + 1)} ${f(hem - 1.3)} Q0 ${f(hem + 0.8)} ${f(-left[left.length - 1][0] - 1)} ${f(hem - 1.3)}`, 'hs'))
        break
      }
      case 'shorts': {
        const outer: P[] = [
          [-(b.tw(t0) + 0.8), t0],
          [-(b.hipHalf + 1.4), b.hipY],
          [-(b.legX[0] + b.legW[0] / 2 + 1.8), hem],
        ]
        const ro = mirror(outer).reverse()
        const d = `${curve(outer)} L${pt([-0.8, hem + 0.6])} L0 ${f(b.crotchY + 1.2)} L${pt([0.8, hem + 0.6])} L${pt(ro[0])} ${tail(ro)} Q0 ${f(t0 + 0.6)} ${pt(outer[0])} Z`
        under.push(piece(d, 'sh'))
        const bandB = t0 + 3.2
        under.push(piece(sym([[-(b.tw(t0) + 0.9), t0], [-(b.tw(bandB) + 1), bandB]]), 'band'))
        under.push(<circle key="btn" cx={0} cy={t0 + 1.6} r={0.9} fill={GOLD} />)
        under.push(st(`M0 ${f(bandB)} Q0 ${f(bandB + 6)} -2 ${f(bandB + 9)}`, 'fly'))
        break
      }
      case 'croptop': {
        under.push(
          piece(
            sym(
              [
                [-(b.neckW / 2 + 1.1), b.shoulderY - 1.9],
                [-(b.shoulderHalf - 0.1), b.shoulderY + 3],
                [-(b.bustHalf + 1.5), b.armpitY + 1],
                [-(b.bustHalf + 1.4), b.bustY],
                [-(b.tw(hem) + 1.6), hem],
              ],
              [0, hem + 0.8],
              [0, b.shoulderY + 3.2],
            ),
            'ct',
          ),
        )
        under.push(st(`M${f(-(b.tw(hem) + 0.6))} ${f(hem - 1)} Q0 ${f(hem)} ${f(b.tw(hem) + 0.6)} ${f(hem - 1)}`, 'hs'))
        const sl = armShape(b, b.shoulderY + 1.5, b.armpitY + H * 0.045, 1.2)
        over.push(piece(sl, 'sl1'), flip(piece(sl, 'sl2i'), 'sl2'))
        break
      }
      case 'corset': {
        const l: P[] = [
          [-(b.tw(t0) + 0.7), t0 + 1.2],
          [-(b.bustHalf + 0.4), b.bustY + 2],
          [-(b.waistHalf + 0.6), b.waistY],
          [-(b.tw(hem - 2.5) + 0.8), hem - 2.5],
        ]
        const r = mirror(l).reverse()
        const d = `${curve(l)} Q${pt([-b.waistHalf * 0.4, hem - 1.5])} 0 ${f(hem)} Q${pt([b.waistHalf * 0.4, hem - 1.5])} ${pt(r[0])} ${tail(r)} Q${pt([b.bustHalf * 0.5, t0 - 1.6])} 0 ${f(t0 + 2.2)} Q${pt([-b.bustHalf * 0.5, t0 - 1.6])} ${pt(l[0])} Z`
        ;[1, -1].forEach((s) =>
          under.push(<path key={`strap${s}`} d={`M${f(s * b.bustHalf * 0.55)} ${f(t0 + 0.6)} L${f(s * (b.neckW / 2 + 2.6))} ${f(b.shoulderY - 1)}`} stroke={D} strokeWidth={0.9} strokeLinecap="round" />),
        )
        under.push(piece(d, 'cs'))
        ;[-0.5, -0.22, 0.22, 0.5].forEach((r, i) =>
          under.push(<path key={`bn${i}`} d={`M${f(r * b.bustHalf * 2)} ${f(t0 + 3)} L${f(r * b.waistHalf * 2)} ${f(hem - 3.5)}`} stroke={D} strokeWidth={0.3} opacity={0.4} />),
        )
        for (let y = t0 + 4; y < hem - 4; y += 3.2) {
          under.push(<path key={`lc${y}`} d={`M-1.1 ${f(y)} L1.1 ${f(y + 2.4)} M1.1 ${f(y)} L-1.1 ${f(y + 2.4)}`} stroke={CORD} strokeWidth={0.35} />)
        }
        break
      }
      case 'vest':
      case 'jacket': {
        const jacket = spec.shape === 'jacket'
        const g = jacket ? 1.8 : 1.2
        const left: P[] = jacket
          ? [
              [-(b.neckW / 2 + 1.4), b.shoulderY - 2],
              [-(b.shoulderHalf + 0.4), b.shoulderY + 2.8],
              [-(b.bustHalf + g + 0.4), b.armpitY + 1],
              [-(b.bustHalf + g), b.bustY],
              [-(b.waistHalf + g + 0.6), b.waistY],
              [-(b.tw(hem) + g), hem],
            ]
          : [
              [-(b.neckW / 2 + 1.4), b.shoulderY - 2],
              [-(b.shoulderHalf - 2.2), b.shoulderY + 1],
              [-(b.bustHalf - 1.2), b.armpitY + 0.5],
              [-(b.bustHalf + g), b.bustY + 3],
              [-(b.waistHalf + g + 0.6), b.waistY],
              [-(b.tw(hem) + g), hem],
            ]
        under.push(piece(sym(left, [0, hem + 0.6], [0, b.shoulderY + 1]), 'jb'))
        // Open V-neck showing the base tee, with the collar either side
        const vY = b.bustY + (jacket ? 1 : 3)
        under.push(<path key="v" d={`M${f(-(b.neckW / 2 + 1.3))} ${f(b.shoulderY - 1.6)} L0 ${f(vY)} L${f(b.neckW / 2 + 1.3)} ${f(b.shoulderY - 1.6)} Q0 ${f(b.shoulderY + 1.5)} ${f(-(b.neckW / 2 + 1.3))} ${f(b.shoulderY - 1.6)} Z`} fill={TEE} stroke={TEE_D} strokeWidth={0.3} />)
        ;[1, -1].forEach((s) => {
          const c = `M${f(s * (b.neckW / 2 + 1.4))} ${f(b.shoulderY - 2)} L${f(s * (b.neckW / 2 + 5))} ${f(b.armpitY - 1)} L${f(s * 1.2)} ${f(vY - 3)} Z`
          under.push(piece(c, `col${s}`), <path key={`cols${s}`} d={c} fill="#000" opacity={0.12} />)
          under.push(<rect key={`pk${s}`} x={f(s > 0 ? b.bustHalf * 0.25 : -b.bustHalf * 0.25 - 7)} y={f(b.bustY + 1.5)} width={7} height={5} fill="none" stroke={D} strokeWidth={0.3} />)
        })
        under.push(<path key="pl" d={`M0 ${f(vY)} L0 ${f(hem + 0.5)}`} stroke={D} strokeWidth={0.35} />)
        for (let y = vY + 3, i = 0; y < hem - 1.5; y += (hem - vY) / 4, i++) under.push(<circle key={`b${i}`} cx={0} cy={f(y)} r={0.85} fill={GOLD} />)
        under.push(st(`M${f(-(b.tw(hem) + g - 0.8))} ${f(hem - 1.4)} L${f(b.tw(hem) + g - 0.8)} ${f(hem - 1.4)}`, 'hs'))
        if (jacket) {
          const sl = armShape(b, b.shoulderY + 1.5, b.arm[2][1] - 1, 1.4)
          over.push(piece(sl, 'sl1'), flip(piece(sl, 'sl2i'), 'sl2'))
          const cuffY = b.arm[2][1] - 4
          const a = armAt(b, cuffY)
          ;[1, -1].forEach((s) => over.push(st(`M${f(s * (a.x - a.w - 1))} ${f(cuffY)} L${f(s * (a.x + a.w + 1))} ${f(cuffY)}`, `cf${s}`)))
        }
        break
      }
      case 'dress': {
        const left: P[] = [
          [-(b.bustHalf * 0.74), t0],
          [-(b.bustHalf * 0.86), b.bustY + 2],
          [-(b.waistHalf + 0.6), b.waistY],
          [-(b.hipHalf + 2.4), b.hipY],
          [-(b.hipHalf + 6.5), hem],
        ]
        ;[1, -1].forEach((s) => {
          const d = `M${f(s * b.bustHalf * 0.6)} ${f(t0 + 0.5)} L${f(s * (b.neckW / 2 + 3.2))} ${f(b.shoulderY - 0.8)}`
          under.push(<path key={`sa${s}`} d={d} stroke={D} strokeWidth={2.9} strokeLinecap="round" />, <path key={`sb${s}`} d={d} stroke={`url(#fab${uid})`} strokeWidth={2.2} strokeLinecap="round" />)
          under.push(<circle key={`sbt${s}`} cx={f(s * b.bustHalf * 0.6)} cy={f(t0 + 1.8)} r={0.95} fill={GOLD} />)
        })
        under.push(piece(sym(left, [0, hem + 2], [0, t0 - 0.4]), 'dr'))
        under.push(<rect key="bib" x={f(-b.bustHalf * 0.36)} y={f(t0 + 4)} width={f(b.bustHalf * 0.72)} height={f((b.waistY - t0) * 0.45)} fill={F} stroke={D} strokeWidth={0.3} />)
        under.push(st(`M${f(-(b.waistHalf + 0.6))} ${f(b.waistY + 1)} L${f(b.waistHalf + 0.6)} ${f(b.waistY + 1)}`, 'ws'))
        under.push(st(`M${f(-(b.hipHalf + 5.4))} ${f(hem - 1.2)} Q0 ${f(hem + 1)} ${f(b.hipHalf + 5.4)} ${f(hem - 1.2)}`, 'hs'))
        break
      }
      case 'apron': {
        const left: P[] = [
          [-(b.bustHalf * 0.6), t0],
          [-(b.bustHalf * 0.64), b.waistY - 1.5],
          [-(b.waistHalf + 2), b.waistY + 2],
          [-(b.hipHalf + 2.2), b.hipY + 3],
          [-(b.hipHalf + 2.6), hem],
        ]
        ;[1, -1].forEach((s) => {
          under.push(<path key={`n${s}`} d={`M${f(s * b.bustHalf * 0.5)} ${f(t0 + 0.4)} L${f(s * (b.neckW / 2 + 0.4))} ${f(b.shoulderY - 2.5)}`} stroke={CORD} strokeWidth={0.9} strokeLinecap="round" />)
          under.push(<path key={`t${s}`} d={`M${f(s * (b.waistHalf + 1.8))} ${f(b.waistY + 2)} Q${f(s * (b.waistHalf + 5))} ${f(b.waistY + 4)} ${f(s * (b.waistHalf + 4))} ${f(b.waistY + 11)}`} fill="none" stroke={CORD} strokeWidth={0.9} strokeLinecap="round" />)
        })
        under.push(piece(sym(left, [0, hem + 0.5], [0, t0 - 0.3]), 'ap'))
        const py = b.hipY + 2
        under.push(<rect key="pk" x={f(-b.hipHalf * 0.6)} y={f(py)} width={f(b.hipHalf * 1.2)} height={10} fill={F} stroke={D} strokeWidth={0.3} />)
        under.push(<path key="pkd" d={`M0 ${f(py)} V${f(py + 10)}`} stroke={D} strokeWidth={0.3} />)
        under.push(st(`M${f(-b.bustHalf * 0.5)} ${f(t0 + 1.4)} L${f(b.bustHalf * 0.5)} ${f(t0 + 1.4)}`, 'ts'))
        break
      }
    }
  }

  if (zone === 'hand') {
    const h = HELD[spec.shape]
    if (h) extras.push(<Placed key="held" uid={`${uid}h`} spec={spec} anchor={h.grip} at={[handX, handY - 1]} width={h.width} span={h.span} />)
  } else if (zone === 'crossbody') {
    const small = spec.shape === 'sling'
    const from: P = [-(b.shoulderHalf - 3.5), b.shoulderY + 0.5]
    const to: P = [b.hipHalf - (small ? 3 : 2), b.hipY - (small ? 9 : 5)]
    const d = `M${pt(from)} Q${pt([0, b.bustY + 6])} ${pt(to)}`
    extras.push(<path key="cs1" d={d} fill="none" stroke={D} strokeWidth={1.5} strokeLinecap="round" />, <path key="cs2" d={d} fill="none" stroke={small ? '#26282a' : `url(#fab${uid})`} strokeWidth={1} strokeLinecap="round" />)
    extras.push(<Placed key="cb" uid={`${uid}c`} spec={spec} noBack anchor={small ? [100, 88] : [100, 98]} at={to} width={small ? 11 : 23} span={small ? 60 : 104} />)
  } else if (zone === 'head') {
    if (spec.shape === 'buckethat') extras.push(<Placed key="hat" uid={`${uid}t`} spec={spec} anchor={[100, 116]} at={[0, b.headH * 0.36]} width={b.headW * 1.85} span={140} />)
    else extras.push(<Placed key="hb" uid={`${uid}t`} spec={spec} anchor={[100, 70]} at={[0, b.headH * 0.05]} width={b.headW * 1.1} span={120} />)
  } else if (zone === 'neck') {
    if (spec.shape === 'bandana') extras.push(<Placed key="bd" uid={`${uid}n`} spec={spec} anchor={[100, 70]} at={[0, b.shoulderY - 2.2]} width={b.neckW * 2.6} span={132} />)
    else {
      const len = b.bustY + H * 0.05 - b.headH
      extras.push(<Placed key="ly" uid={`${uid}n`} spec={spec} anchor={[100, 24]} at={[0, b.headH + 0.5]} width={(len / 142) * 88} span={88} />)
    }
  } else if (zone === 'wrist') {
    extras.push(<Placed key="sc" uid={`${uid}w`} spec={spec} anchor={[114, 120]} at={[b.arm[2][0], b.arm[2][1] - 1.5]} width={7.5} span={88} />)
  } else if (zone === 'feet') {
    shoes = [1, -1].map((s) => (
      <g key={`sh${s}`} transform={`scale(${s} 1)`}>
        {piece(foot, `f${s}`)}
        <path d={`M${f(ax - 4.4)} ${f(H - 1.3)} L${f(ax + 4.6)} ${f(H - 1.3)}`} stroke="#f1efe9" strokeWidth={1.4} />
        <circle cx={f(ax + 1.4)} cy={f(b.ankleY + 1.6)} r={0.9} fill="#ffd23f" />
        <path d={`M${f(ax - 2.6)} ${f(b.ankleY + 3)} q1.6 -1.2 3.2 0`} stroke="#ff5c8a" strokeWidth={0.7} fill="none" strokeLinecap="round" />
      </g>
    ))
  }

  /* ---------------- hair ---------------- */
  const hairBack =
    profile.model === 'female'
      ? `M${f(-hw * 1.06)} ${f(b.headH * 0.42)} C${f(-hw * 1.2)} ${f(b.shoulderY - 1)} ${f(-hw * 0.7)} ${f(b.shoulderY + 1.5)} ${f(-hw * 0.2)} ${f(b.shoulderY)} L${f(hw * 0.2)} ${f(b.shoulderY)} C${f(hw * 0.7)} ${f(b.shoulderY + 1.5)} ${f(hw * 1.2)} ${f(b.shoulderY - 1)} ${f(hw * 1.06)} ${f(b.headH * 0.42)} Z`
      : null
  const capLow = profile.model === 'male' ? 0.3 : profile.model === 'neutral' ? 0.42 : 0.5
  const hairCap = `M${f(-hw * 1.04)} ${f(b.headH * capLow)} C${f(-hw * 1.12)} ${f(-b.headH * 0.1)} ${f(hw * 1.12)} ${f(-b.headH * 0.1)} ${f(hw * 1.04)} ${f(b.headH * capLow)} C${f(hw * 0.75)} ${f(b.headH * 0.2)} ${f(-hw * 0.15)} ${f(b.headH * 0.13)} ${f(-hw * 1.04)} ${f(b.headH * capLow)} Z`

  /* ---------------- measurement callouts ---------------- */
  const sy = (y: number) => top + y * K
  const callouts: { label: string; y: number; half: number }[] = [
    { label: `Bust ${profile.bust} cm`, y: b.bustY, half: b.bustHalf },
    { label: `Waist ${profile.waist} cm`, y: b.waistY, half: b.waistHalf },
    { label: `Hips ${profile.hips} cm`, y: b.hipY, half: b.hipHalf },
  ]

  return (
    <svg className="fit-svg" viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label={`Illustrative ${profile.model} model, ${profile.height} cm, wearing the transformed item`}>
      <defs>
        <radialGradient id={`bg${uid}`} cx="50%" cy="40%" r="75%">
          <stop offset="0" stopColor="#faf5f7" />
          <stop offset="1" stopColor="#e8dde6" />
        </radialGradient>
        <linearGradient id={`skin${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={SKIN_D} />
          <stop offset="0.35" stopColor={SKIN} />
          <stop offset="0.65" stopColor={SKIN} />
          <stop offset="1" stopColor={SKIN_D} />
        </linearGradient>
        <filter id={`bl${uid}`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <MockDefs uid={uid} material={spec.material} colour={spec.colour} fabScale={0.7} patScale={0.3} />
      </defs>
      <rect width={VW} height={VH} fill={`url(#bg${uid})`} />

      {/* height scale */}
      <g className="fit-ruler">
        <line x1={VW - 12} y1={FLOOR} x2={VW - 12} y2={FLOOR - 200 * K} />
        {Array.from({ length: 21 }, (_, i) => i * 10).map((cm) => (
          <line key={cm} x1={VW - (cm % 50 === 0 ? 18 : 15)} y1={f(FLOOR - cm * K)} x2={VW - 12} y2={f(FLOOR - cm * K)} />
        ))}
        {[50, 100, 150, 200].map((cm) => (
          <text key={cm} x={VW - 20} y={f(FLOOR - cm * K + 2.5)} textAnchor="end">
            {cm}
          </text>
        ))}
        <line className="fit-ruler-mark" x1={CX + 4} y1={f(top)} x2={VW - 12} y2={f(top)} />
        <text className="fit-ruler-val" x={VW - 20} y={f(top - 4)} textAnchor="end">
          {profile.height} cm
        </text>
      </g>

      <ellipse cx={CX} cy={FLOOR + 1} rx={34} ry={4} fill="#000" opacity={0.18} filter={`url(#bl${uid})`} />

      <g transform={`translate(${CX} ${f(top)}) scale(${f(K)})`}>
        {hairBack && <path d={hairBack} fill={HAIR} />}
        {/* legs & feet */}
        {[1, -1].map((s) => (
          <g key={`leg${s}`} transform={`scale(${s} 1)`}>
            <path d={leg} fill={skin} stroke={SKIN_D} strokeWidth={0.25} />
          </g>
        ))}
        {/* torso */}
        <path d={torso} fill={skin} stroke={SKIN_D} strokeWidth={0.25} />
        {/* head */}
        <ellipse cx={0} cy={f(b.headH / 2)} rx={f(hw)} ry={f(b.headH / 2)} fill={skin} stroke={SKIN_D} strokeWidth={0.25} />
        <path d={hairCap} fill={HAIR} />

        {/* base outfit */}
        {showTrousers && <path d={trousers} fill={TROUSER} stroke={TROUSER_D} strokeWidth={0.3} />}
        {showTee && <path d={tee} fill={TEE} stroke={TEE_D} strokeWidth={0.3} />}
        {shoes ?? [1, -1].map((s) => <path key={`shoe${s}`} d={foot} transform={`scale(${s} 1)`} fill={SHOE} />)}

        {under}

        {/* arms */}
        {[1, -1].map((s) => (
          <g key={`arm${s}`} transform={`scale(${s} 1)`}>
            <path d={armShape(b, b.shoulderY + 1, b.arm[2][1] + 0.5)} fill={skin} stroke={SKIN_D} strokeWidth={0.25} />
          </g>
        ))}
        {showTeeSleeves && [1, -1].map((s) => <path key={`ts${s}`} d={teeSleeve} transform={`scale(${s} 1)`} fill={TEE} stroke={TEE_D} strokeWidth={0.3} />)}
        {over}
        {extras}
        {/* hands */}
        {[1, -1].map((s) => (
          <ellipse key={`hand${s}`} cx={f(s * handX)} cy={f(handY)} rx={2.9} ry={f(H * 0.031)} fill={skin} stroke={SKIN_D} strokeWidth={0.25} />
        ))}
      </g>

      {showMeasures && (
        <g className="fit-callouts">
          {callouts.map((c) => (
            <g key={c.label}>
              <line x1={8} y1={f(sy(c.y))} x2={f(CX - c.half * K)} y2={f(sy(c.y))} className="lead" />
              <line x1={f(CX - c.half * K)} y1={f(sy(c.y))} x2={f(CX + c.half * K)} y2={f(sy(c.y))} className="girth" />
              <text x={8} y={f(sy(c.y) - 3)}>
                {c.label}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  )
}

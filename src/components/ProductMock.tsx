import { useId, type CSSProperties, type ReactNode } from 'react'
import type { Material } from '../lib/engine'

/**
 * Local, dependency-free product visuals. Every transformation idea and every
 * source garment can be drawn here in the garment's own fabric and colour, so
 * the Transform experience never depends on a network image.
 */

export type Shape =
  | 'tote' | 'shoulder' | 'pouch' | 'sling' | 'sleeve' | 'bucketbag' | 'crossbody' | 'drawstring'
  | 'miniskirt' | 'midiskirt' | 'croptop' | 'corset' | 'vest' | 'jacket' | 'dress' | 'shorts'
  | 'buckethat' | 'scrunchie' | 'headband' | 'keychain' | 'wallet' | 'lanyard' | 'bandana'
  | 'cushion' | 'apron' | 'coasters' | 'planter' | 'shadowbox' | 'repaint'
  | 'tee' | 'hoodie' | 'jeans' | 'sneaker'

export interface MockSpec {
  shape: Shape
  material: Material
  colour: string
  patch?: boolean
}

/* ---------- colour helpers ---------- */
const hex = (h: string) => {
  const v = h.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16))
}
const toHex = (rgb: number[]) => '#' + rgb.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')
const mix = (a: string, b: string, t: number) => {
  const A = hex(a)
  const B = hex(b)
  return toHex(A.map((c, i) => c + (B[i] - c) * t))
}
const lum = (h: string) => {
  const [r, g, b] = hex(h)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

interface Ctx {
  F: string
  D: string
  T: string
  st: (d: string, key?: string | number) => ReactNode
  strap: (d: string, w: number, key?: string | number) => ReactNode
}

interface ShapeDef {
  back?: ReactNode
  body: string[]
  front?: ReactNode
  transform?: string
  evenodd?: boolean
}

const GOLD = '#c9a14a'
const METAL = '#b8bcc0'
const CORD = '#ebe5d6'

function ruffle(cx: number, cy: number, R: number) {
  const outer: string[] = []
  const inner: string[] = []
  const n = 72
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    const r = R + R * 0.1 * Math.sin(a * 14)
    outer.push(`${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * 0.8 * Math.sin(a)).toFixed(1)}`)
    const ri = R * 0.42
    inner.push(`${i ? 'L' : 'M'}${(cx + ri * Math.cos(-a)).toFixed(1)} ${(cy + ri * 0.8 * Math.sin(-a)).toFixed(1)}`)
  }
  return `${outer.join(' ')} Z ${inner.join(' ')} Z`
}

const SNEAKER = 'M36 146 L40 116 Q52 104 74 108 L104 92 Q126 86 138 104 L162 122 Q172 132 164 146 Z'
const SOLE = 'M32 146 H166 Q172 152 164 160 H38 Q28 153 32 146 Z'

const SHAPES: Record<Shape, (c: Ctx) => ShapeDef> = {
  tote: ({ F, D, st, strap }) => ({
    back: [strap('M70 78 C70 32 96 32 96 78', 7, 1), strap('M104 78 C104 32 130 32 130 78', 7, 2)],
    body: ['M50 76 L150 76 L157 170 L43 170 Z'],
    front: [
      <path key="p" d="M78 108 H122 V142 H78 Z" fill={F} stroke={D} strokeWidth={1.1} />,
      <path key="ps" d="M78 108 H122 V142 H78 Z" fill="#000" opacity={0.06} />,
      st('M52 86 H148', 'a'),
      st('M81 112 H119', 'b'),
      st('M46 160 H154', 'c'),
    ],
  }),
  shoulder: ({ F, D, st, strap }) => ({
    back: strap('M60 96 C58 38 142 38 140 96', 6),
    body: ['M46 94 L154 94 Q154 150 100 164 Q46 150 46 94 Z'],
    front: [
      <path key="f" d="M46 94 L154 94 L150 116 Q100 132 50 116 Z" fill={F} stroke={D} strokeWidth={1.1} />,
      <path key="fs" d="M46 94 L154 94 L150 116 Q100 132 50 116 Z" fill="#000" opacity={0.07} />,
      st('M52 110 Q100 124 148 110', 'a'),
      <rect key="b" x={94} y={119} width={12} height={9} rx={2} fill={GOLD} stroke="#8a6d2c" strokeWidth={0.8} />,
    ],
  }),
  pouch: ({ st }) => ({
    body: ['M52 92 H148 Q160 92 160 104 V150 Q160 162 148 162 H52 Q40 162 40 150 V104 Q40 92 52 92 Z'],
    front: [
      <path key="z" d="M46 104 H154" stroke="#2f2f2f" strokeWidth={3} strokeDasharray="1.6 1.4" />,
      <rect key="p" x={146} y={100} width={7} height={16} rx={2} fill={METAL} stroke="#6f7478" strokeWidth={0.8} />,
      st('M46 154 H154', 'a'),
    ],
  }),
  sling: ({ F, D, st }) => ({
    back: [
      <path key="a" d="M82 92 L60 18" stroke="#26282a" strokeWidth={4.5} strokeLinecap="round" />,
      <path key="b" d="M118 92 L140 18" stroke="#26282a" strokeWidth={4.5} strokeLinecap="round" />,
    ],
    body: ['M78 88 H122 Q130 88 130 96 V160 Q130 168 122 168 H78 Q70 168 70 160 V96 Q70 88 78 88 Z'],
    front: [
      <path key="p" d="M74 122 H126 V160 Q126 164 122 164 H78 Q74 164 74 160 Z" fill={F} stroke={D} strokeWidth={1} />,
      <path key="ps" d="M74 122 H126 V160 Q126 164 122 164 H78 Q74 164 74 160 Z" fill="#000" opacity={0.07} />,
      st('M76 127 H124', 'a'),
      <rect key="c1" x={77} y={84} width={9} height={7} rx={1.5} fill={METAL} />,
      <rect key="c2" x={114} y={84} width={9} height={7} rx={1.5} fill={METAL} />,
    ],
  }),
  sleeve: ({ st }) => ({
    body: ['M34 72 H166 Q174 72 174 80 V156 Q174 164 166 164 H34 Q26 164 26 156 V80 Q26 72 34 72 Z'],
    front: [
      <path key="z" d="M32 79 H160 Q167 79 167 86 V158" fill="none" stroke="#2f2f2f" strokeWidth={2.6} strokeDasharray="1.4 1.3" />,
      <rect key="p" x={155} y={74} width={7} height={14} rx={2} fill={METAL} stroke="#6f7478" strokeWidth={0.8} />,
      <rect key="l" x={38} y={140} width={30} height={12} rx={2} fill="#f2efe8" stroke="#cfc9bc" strokeWidth={0.8} />,
      st('M32 158 H160', 'a'),
    ],
  }),
  bucketbag: ({ F, D, strap }) => ({
    back: strap('M70 70 C70 28 130 28 130 70', 5),
    body: ['M58 70 H142 L150 150 Q150 170 100 170 Q50 170 50 150 Z'],
    front: [
      <path key="c" d="M58 70 H142 L143 86 H57 Z" fill={F} stroke={D} strokeWidth={1} />,
      <path key="cs" d="M58 70 H142 L143 86 H57 Z" fill="#000" opacity={0.14} />,
      ...[68, 84, 100, 116, 132].map((x) => <circle key={x} cx={x} cy={78} r={2.4} fill={GOLD} />),
      <path key="k1" d="M100 80 Q96 100 88 116" fill="none" stroke={CORD} strokeWidth={2.6} strokeLinecap="round" />,
      <path key="k2" d="M100 80 Q106 100 114 114" fill="none" stroke={CORD} strokeWidth={2.6} strokeLinecap="round" />,
    ],
  }),
  crossbody: ({ F, D, st }) => ({
    back: [
      <path key="a" d="M58 100 L38 20" stroke={D} strokeWidth={3.5} strokeLinecap="round" />,
      <path key="b" d="M142 100 L162 20" stroke={D} strokeWidth={3.5} strokeLinecap="round" />,
    ],
    body: ['M56 96 H144 Q152 96 152 104 V150 Q152 158 144 158 H56 Q48 158 48 150 V104 Q48 96 56 96 Z'],
    front: [
      <path key="f" d="M48 104 Q48 96 56 96 H144 Q152 96 152 104 V124 Q100 136 48 124 Z" fill={F} stroke={D} strokeWidth={1} />,
      <path key="fs" d="M48 104 Q48 96 56 96 H144 Q152 96 152 104 V124 Q100 136 48 124 Z" fill="#000" opacity={0.08} />,
      st('M54 118 Q100 128 146 118', 'a'),
      <circle key="c" cx={100} cy={128} r={5} fill={GOLD} stroke="#8a6d2c" strokeWidth={0.8} />,
    ],
  }),
  drawstring: ({ D, st }) => ({
    back: [
      <path key="a" d="M64 70 Q38 92 46 146" fill="none" stroke={CORD} strokeWidth={2.6} strokeLinecap="round" />,
      <path key="b" d="M136 70 Q162 92 154 146" fill="none" stroke={CORD} strokeWidth={2.6} strokeLinecap="round" />,
    ],
    body: ['M62 68 H138 L150 160 Q150 168 142 168 H58 Q50 168 50 160 Z'],
    front: [
      <path key="g" d="M68 72 L70 86 M82 70 L83 86 M96 70 L96 86 M110 70 L110 86 M124 70 L123 86 M134 72 L132 86" stroke={D} strokeWidth={1} opacity={0.5} />,
      st('M54 158 H146', 'a'),
    ],
  }),
  miniskirt: ({ F, D, st }) => ({
    body: ['M64 62 H136 L154 148 Q100 156 46 148 Z'],
    front: [
      <path key="w" d="M64 62 H136 L137 75 H63 Z" fill={F} stroke={D} strokeWidth={1} />,
      <path key="ws" d="M64 62 H136 L137 75 H63 Z" fill="#000" opacity={0.12} />,
      <circle key="b" cx={100} cy={68.5} r={2.6} fill={GOLD} />,
      st('M63 78 H137', 'a'),
      st('M100 78 L100 150', 'b'),
      st('M50 142 Q100 150 150 142', 'c'),
    ],
  }),
  midiskirt: ({ F, D, st }) => ({
    body: ['M70 48 H130 L162 170 Q100 180 38 170 Z'],
    front: [
      <path key="w" d="M70 48 H130 L131 60 H69 Z" fill={F} stroke={D} strokeWidth={1} />,
      <path key="ws" d="M70 48 H130 L131 60 H69 Z" fill="#000" opacity={0.12} />,
      <path key="p" d="M86 60 L70 172 M100 60 L100 177 M114 60 L130 172" stroke={D} strokeWidth={1} opacity={0.4} />,
      st('M42 164 Q100 174 158 164', 'a'),
    ],
  }),
  croptop: ({ D, st }) => ({
    body: ['M62 58 L82 50 Q100 64 118 50 L138 58 L160 82 L142 94 L140 120 Q100 126 60 120 L58 94 L40 82 Z'],
    front: [
      <path key="n" d="M82 50 Q100 66 118 50" fill="none" stroke={D} strokeWidth={1.6} />,
      st('M62 114 Q100 120 138 114', 'a'),
      st('M45 84 L58 91', 'b'),
      st('M155 84 L142 91', 'c'),
    ],
  }),
  corset: ({ D, st }) => ({
    back: [
      <path key="a" d="M74 58 L78 34" stroke={D} strokeWidth={3} strokeLinecap="round" />,
      <path key="b" d="M126 58 L122 34" stroke={D} strokeWidth={3} strokeLinecap="round" />,
    ],
    body: ['M64 56 Q100 68 136 56 L142 104 L134 156 Q100 146 66 156 L58 104 Z'],
    front: [
      <path key="bn" d="M78 62 L75 150 M122 62 L125 150 M90 66 L89 148 M110 66 L111 148" stroke={D} strokeWidth={1.1} opacity={0.4} />,
      <path key="lace" d="M96 76 L104 88 M104 76 L96 88 M96 90 L104 102 M104 90 L96 102 M96 104 L104 116 M104 104 L96 116 M96 118 L104 130 M104 118 L96 130" stroke={CORD} strokeWidth={1.4} />,
      ...[76, 88, 102, 116, 130].flatMap((y) => [
        <circle key={`l${y}`} cx={96} cy={y} r={1.8} fill={METAL} />,
        <circle key={`r${y}`} cx={104} cy={y} r={1.8} fill={METAL} />,
      ]),
      st('M66 64 Q100 76 134 64', 'a'),
    ],
  }),
  vest: ({ F, D, st }) => ({
    body: ['M60 50 L88 42 L100 74 L112 42 L140 50 Q132 76 142 96 L144 138 L56 138 L58 96 Q68 76 60 50 Z'],
    front: [
      <path key="c1" d="M88 42 L80 60 L97 71 Z" fill={F} stroke={D} strokeWidth={1} />,
      <path key="c2" d="M112 42 L120 60 L103 71 Z" fill={F} stroke={D} strokeWidth={1} />,
      <path key="c3" d="M88 42 L80 60 L97 71 Z M112 42 L120 60 L103 71 Z" fill="#000" opacity={0.12} />,
      <path key="pl" d="M100 74 L100 138" stroke={D} strokeWidth={1.2} />,
      ...[86, 102, 118].map((y) => <circle key={y} cx={100} cy={y} r={2.4} fill={GOLD} />),
      <rect key="p1" x={68} y={84} width={20} height={15} fill="none" stroke={D} strokeWidth={1} />,
      <rect key="p2" x={112} y={84} width={20} height={15} fill="none" stroke={D} strokeWidth={1} />,
      st('M58 130 H142', 'a'),
    ],
  }),
  jacket: ({ F, D, st }) => ({
    body: ['M70 46 L88 40 L100 60 L112 40 L130 46 L160 66 L172 142 L152 146 L144 100 L146 164 L54 164 L56 100 L48 146 L28 142 L40 66 Z'],
    front: [
      <path key="c" d="M88 40 L80 58 L98 68 Z M112 40 L120 58 L102 68 Z" fill={F} stroke={D} strokeWidth={1} />,
      <path key="cs" d="M88 40 L80 58 L98 68 Z M112 40 L120 58 L102 68 Z" fill="#000" opacity={0.12} />,
      <path key="pl" d="M100 62 L100 164" stroke={D} strokeWidth={1.2} />,
      ...[80, 100, 120, 140].map((y) => <circle key={y} cx={100} cy={y} r={2.3} fill={GOLD} />),
      <rect key="p1" x={66} y={82} width={22} height={16} fill="none" stroke={D} strokeWidth={1} />,
      <rect key="p2" x={112} y={82} width={22} height={16} fill="none" stroke={D} strokeWidth={1} />,
      st('M56 156 H144', 'a'),
    ],
  }),
  dress: ({ F, D, st }) => ({
    body: ['M78 38 H90 L92 72 H108 L110 38 H122 L126 88 L154 172 Q100 180 46 172 L74 88 Z'],
    front: [
      <rect key="p" x={88} y={74} width={24} height={16} fill={F} stroke={D} strokeWidth={1} />,
      <circle key="b1" cx={84} cy={44} r={2.6} fill={GOLD} />,
      <circle key="b2" cx={116} cy={44} r={2.6} fill={GOLD} />,
      st('M74 92 Q100 98 126 92', 'a'),
      st('M50 166 Q100 174 150 166', 'b'),
    ],
  }),
  shorts: ({ F, D, st }) => ({
    body: ['M50 66 H150 L160 140 L112 146 L100 100 L88 146 L40 140 Z'],
    front: [
      <path key="w" d="M50 66 H150 L151 78 H49 Z" fill={F} stroke={D} strokeWidth={1} />,
      <path key="ws" d="M50 66 H150 L151 78 H49 Z" fill="#000" opacity={0.12} />,
      <circle key="b" cx={100} cy={72} r={2.6} fill={GOLD} />,
      st('M100 80 Q100 94 94 100', 'a'),
      st('M56 82 Q72 86 76 98', 'b'),
      st('M144 82 Q128 86 124 98', 'c'),
      st('M43 132 L88 138', 'd'),
      st('M112 138 L157 132', 'e'),
    ],
  }),
  buckethat: ({ D, st }) => ({
    body: ['M30 118 Q100 94 170 118 Q156 146 100 142 Q44 146 30 118 Z', 'M64 116 Q62 64 100 62 Q138 64 136 116 Q100 124 64 116 Z'],
    front: [
      st('M40 122 Q100 104 160 122', 'a'),
      st('M50 130 Q100 116 150 130', 'b'),
      <path key="band" d="M64 106 Q100 114 136 106" fill="none" stroke={D} strokeWidth={3} opacity={0.35} />,
      st('M76 78 Q100 70 124 78', 'c'),
    ],
  }),
  scrunchie: ({ D }) => ({
    evenodd: true,
    body: [ruffle(70, 96, 30), ruffle(114, 120, 44)],
    front: [
      ...Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2
        return <path key={i} d={`M${114 + 24 * Math.cos(a)} ${120 + 19 * Math.sin(a)} L${114 + 40 * Math.cos(a)} ${120 + 32 * Math.sin(a)}`} stroke={D} strokeWidth={1} opacity={0.3} />
      }),
    ],
  }),
  headband: ({ st }) => ({
    body: ['M40 124 Q100 40 160 124 L148 130 Q100 62 52 130 Z', 'M84 66 Q100 50 116 66 Q120 82 100 86 Q80 82 84 66 Z'],
    front: [st('M47 122 Q100 50 153 122', 'a')],
  }),
  keychain: ({ D, st }) => ({
    back: [
      <circle key="r" cx={100} cy={46} r={16} fill="none" stroke={METAL} strokeWidth={4} />,
      <path key="l" d="M92 78 Q100 58 108 78" fill="none" stroke={D} strokeWidth={4} />,
    ],
    body: ['M76 76 H124 Q130 76 130 82 V150 Q130 156 124 156 H76 Q70 156 70 150 V82 Q70 76 76 76 Z'],
    front: [<circle key="g" cx={100} cy={90} r={4} fill={METAL} stroke="#6f7478" strokeWidth={0.8} />, st('M76 102 H124 M76 148 H124', 'a')],
  }),
  wallet: ({ D, st }) => ({
    back: <rect x={62} y={68} width={52} height={20} rx={3} fill="#efe9dc" stroke="#cfc6b3" />,
    body: ['M50 82 H150 Q156 82 156 88 V146 Q156 152 150 152 H50 Q44 152 44 146 V88 Q44 82 50 82 Z'],
    front: [<path key="s" d="M50 102 H150 M50 118 H150" stroke={D} strokeWidth={1.2} opacity={0.6} />, st('M50 88 H150 M50 146 H150', 'a')],
  }),
  lanyard: ({ strap }) => ({
    body: [],
    back: [strap('M88 24 C58 60 70 128 100 146', 8, 1), strap('M112 24 C142 60 130 128 100 146', 8, 2)],
    front: [<rect key="c" x={93} y={144} width={14} height={22} rx={3} fill={METAL} stroke="#6f7478" />],
  }),
  bandana: ({ D, st }) => ({
    back: [
      <path key="a" d="M36 72 L16 58" stroke={D} strokeWidth={5} strokeLinecap="round" />,
      <path key="b" d="M164 72 L184 58" stroke={D} strokeWidth={5} strokeLinecap="round" />,
    ],
    body: ['M34 70 H166 L100 166 Z'],
    front: [st('M48 78 H152 L100 154 Z', 'a'), ...[[80, 94], [100, 110], [120, 94], [100, 132]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={3} fill="#fff" opacity={0.6} />)],
  }),
  cushion: ({ D }) => ({
    body: ['M40 58 Q100 46 160 58 Q172 112 160 166 Q100 178 40 166 Q28 112 40 58 Z'],
    front: [
      <path key="c" d="M100 112 L68 80 M100 112 L134 82 M100 112 L70 144 M100 112 L132 144" stroke={D} strokeWidth={1.2} opacity={0.25} />,
      <circle key="b" cx={100} cy={112} r={4.5} fill={D} />,
    ],
  }),
  apron: ({ F, D, st }) => ({
    back: [
      <path key="n" d="M78 42 Q100 18 122 42" fill="none" stroke={CORD} strokeWidth={3} />,
      <path key="a" d="M56 96 Q34 112 30 144" fill="none" stroke={CORD} strokeWidth={3} />,
      <path key="b" d="M144 96 Q166 112 170 144" fill="none" stroke={CORD} strokeWidth={3} />,
    ],
    body: ['M78 42 H122 L124 90 L146 96 L150 172 H50 L54 96 L76 90 Z'],
    front: [
      <rect key="p" x={72} y={118} width={56} height={28} fill={F} stroke={D} strokeWidth={1} />,
      <path key="ps" d="M100 118 V146" stroke={D} strokeWidth={1} />,
      st('M75 122 H125', 'a'),
      st('M80 48 H120', 'b'),
    ],
  }),
  coasters: ({ st }) => ({
    body: ['M48 152 A52 17 0 1 0 152 152 A52 17 0 1 0 48 152 Z', 'M48 138 A52 17 0 1 0 152 138 A52 17 0 1 0 48 138 Z', 'M48 124 A52 17 0 1 0 152 124 A52 17 0 1 0 48 124 Z'],
    front: [st('M58 124 A42 12 0 1 0 142 124 A42 12 0 1 0 58 124 Z', 'a')],
  }),
  planter: ({ D, st }) => ({
    back: [
      <path key="l1" d="M112 96 Q92 50 104 28 Q120 56 118 96 Z" fill="#4f8a4b" />,
      <path key="l2" d="M118 96 Q132 56 158 48 Q146 80 124 98 Z" fill="#6aa864" />,
      <path key="l3" d="M114 98 Q88 70 70 72 Q86 92 110 100 Z" fill="#5c9a56" />,
    ],
    body: [SNEAKER],
    front: [
      <ellipse key="s" cx={120} cy={98} rx={17} ry={5} fill="#5b4636" />,
      <path key="sole" d={SOLE} fill="#f1efe9" stroke="#bdb8ad" strokeWidth={1} />,
      <path key="lc" d="M84 108 L94 102 M90 114 L100 108 M96 120 L106 114" stroke={D} strokeWidth={1.4} />,
      st('M44 138 L158 138', 'a'),
    ],
  }),
  shadowbox: ({ D }) => ({
    back: [
      <rect key="f" x={28} y={36} width={144} height={136} rx={3} fill="#26282a" />,
      <rect key="m" x={38} y={46} width={124} height={116} fill="#f4f2ee" />,
      <rect key="pl" x={86} y={150} width={28} height={5} rx={1} fill={GOLD} />,
    ],
    transform: 'translate(30 20) scale(0.7)',
    body: [SNEAKER],
    front: [
      <path key="sole" d={SOLE} fill="#f1efe9" stroke="#bdb8ad" strokeWidth={1} />,
      <path key="lc" d="M84 108 L94 102 M90 114 L100 108 M96 120 L106 114" stroke={D} strokeWidth={1.4} />,
    ],
  }),
  repaint: ({ D, st }) => ({
    body: [SNEAKER],
    front: [
      <path key="sole" d={SOLE} fill="#f1efe9" stroke="#bdb8ad" strokeWidth={1} />,
      <path key="sp1" d="M60 126 Q80 112 104 124 Q120 132 142 122" fill="none" stroke="#ff5c8a" strokeWidth={5} strokeLinecap="round" />,
      <circle key="sp2" cx={124} cy={108} r={5} fill="#ffd23f" />,
      <circle key="sp3" cx={70} cy={116} r={3.5} fill="#3ddc97" />,
      <path key="lc" d="M84 108 L94 102 M90 114 L100 108 M96 120 L106 114" stroke={D} strokeWidth={1.4} />,
      st('M44 138 L158 138', 'a'),
    ],
  }),
  sneaker: ({ D, st }) => ({
    body: [SNEAKER],
    front: [
      <path key="sole" d={SOLE} fill="#f1efe9" stroke="#bdb8ad" strokeWidth={1} />,
      <path key="lc" d="M84 108 L94 102 M90 114 L100 108 M96 120 L106 114" stroke={D} strokeWidth={1.4} />,
      st('M44 138 L158 138', 'a'),
    ],
  }),
  tee: ({ D, st }) => ({
    body: ['M62 50 L84 42 Q100 56 116 42 L138 50 L162 76 L144 90 L142 162 H58 L56 90 L38 76 Z'],
    front: [<path key="n" d="M84 42 Q100 58 116 42" fill="none" stroke={D} strokeWidth={1.6} />, st('M60 154 H140', 'a')],
  }),
  hoodie: ({ F, D, st }) => ({
    body: ['M64 60 L82 52 L86 40 Q100 26 114 40 L118 52 L136 60 L164 140 L148 146 L140 104 L140 164 H60 L60 104 L52 146 L36 140 Z'],
    front: [
      <path key="h" d="M86 42 Q100 58 114 42" fill="none" stroke={D} strokeWidth={1.6} />,
      <path key="p" d="M76 124 H124 L130 150 H70 Z" fill={F} stroke={D} strokeWidth={1} />,
      <path key="d" d="M96 56 L94 76 M104 56 L106 76" stroke={CORD} strokeWidth={1.6} />,
      st('M62 156 H138', 'a'),
    ],
  }),
  jeans: ({ F, D, st }) => ({
    body: ['M60 38 H140 L152 172 H108 L100 84 L92 172 H48 Z'],
    front: [
      <path key="w" d="M60 38 H140 L141 50 H59 Z" fill={F} stroke={D} strokeWidth={1} />,
      <path key="ws" d="M60 38 H140 L141 50 H59 Z" fill="#000" opacity={0.12} />,
      <circle key="b" cx={100} cy={44} r={2.6} fill={GOLD} />,
      st('M66 54 Q80 58 84 70', 'a'),
      st('M134 54 Q120 58 116 70', 'b'),
      st('M100 52 Q100 70 95 78', 'c'),
    ],
  }),
}

function FabricPattern({ id, material, base, scale = 1 }: { id: string; material: Material; base: string; scale?: number }) {
  const tf = scale === 1 ? undefined : `scale(${scale})`
  const L = mix(base, '#ffffff', 0.35)
  const D = mix(base, '#000000', 0.3)
  switch (material) {
    case 'denim':
      return (
        <pattern id={id} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform={scale === 1 ? 'rotate(40)' : `scale(${scale}) rotate(40)`}>
          <rect width={6} height={6} fill={base} />
          <line x1={0} y1={0} x2={0} y2={6} stroke={L} strokeWidth={1.6} opacity={0.35} />
          <line x1={3} y1={0} x2={3} y2={6} stroke={D} strokeWidth={0.8} opacity={0.22} />
        </pattern>
      )
    case 'wool':
      return (
        <pattern id={id} width={8} height={7} patternUnits="userSpaceOnUse" patternTransform={tf}>
          <rect width={8} height={7} fill={base} />
          <path d="M0 1 L4 5 L8 1" fill="none" stroke={D} strokeWidth={0.9} opacity={0.3} />
        </pattern>
      )
    case 'leather':
      return (
        <pattern id={id} width={9} height={9} patternUnits="userSpaceOnUse" patternTransform={tf}>
          <rect width={9} height={9} fill={base} />
          <circle cx={2} cy={3} r={0.6} fill={L} opacity={0.25} />
          <circle cx={6.5} cy={7} r={0.5} fill={D} opacity={0.3} />
        </pattern>
      )
    case 'nylon':
    case 'polyester':
      return (
        <pattern id={id} width={10} height={5} patternUnits="userSpaceOnUse" patternTransform={tf}>
          <rect width={10} height={5} fill={base} />
          <line x1={0} y1={1} x2={10} y2={1} stroke={L} strokeWidth={0.6} opacity={0.18} />
        </pattern>
      )
    case 'blend':
      return (
        <pattern id={id} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform={tf}>
          <rect width={6} height={6} fill={base} />
          <path d="M0 0 L6 6 M6 0 L0 6" stroke={D} strokeWidth={0.5} opacity={0.18} />
        </pattern>
      )
    default:
      return (
        <pattern id={id} width={4} height={4} patternUnits="userSpaceOnUse" patternTransform={tf}>
          <rect width={4} height={4} fill={base} />
          <circle cx={1} cy={1} r={0.45} fill={D} opacity={0.12} />
        </pattern>
      )
  }
}


/** Colours derived from a garment's base colour: fill base, dark outline (D) and stitch thread (T). */
export function mockPaint(colour: string, material: Material) {
  const base = /^#[0-9a-f]{6}$/i.test(colour) ? colour : '#8fb3d6'
  const D = mix(base, '#000000', 0.38)
  const T = material === 'denim' ? '#d9a54a' : lum(base) > 0.65 ? mix(base, '#000000', 0.35) : mix(base, '#ffffff', 0.5)
  return { base, D, T }
}

/**
 * SVG paint servers for a garment: fabric weave, patchwork and soft shading, keyed by `uid`.
 * `fabScale` / `patScale` resize the weave and patchwork tiles when drawing at a different scale (e.g. on a body in cm).
 */
export function MockDefs({ uid, material, colour, fabScale = 1, patScale = 1 }: { uid: string; material: Material; colour: string; fabScale?: number; patScale?: number }) {
  const { base, T } = mockPaint(colour, material)
  const fab = `fab${uid}`
  // Inside the patchwork tile the weave is drawn in the tile's own (already scaled) space.
  const inner = patScale === 1 ? fab : `fabi${uid}`
  const fi = `url(#${inner})`
  return (
    <>
      <FabricPattern id={fab} material={material} base={base} scale={fabScale} />
      {inner !== fab && <FabricPattern id={inner} material={material} base={base} scale={fabScale / patScale} />}
      <pattern id={`pat${uid}`} width={40} height={40} patternUnits="userSpaceOnUse" patternTransform={patScale === 1 ? undefined : `scale(${patScale})`}>
        <rect width={20} height={20} fill={fi} />
        <rect x={20} width={20} height={20} fill={fi} />
        <rect x={20} width={20} height={20} fill="#fff" opacity={0.2} />
        <rect y={20} width={20} height={20} fill={fi} />
        <rect y={20} width={20} height={20} fill="#000" opacity={0.18} />
        <rect x={20} y={20} width={20} height={20} fill={fi} />
        <rect x={20} y={20} width={20} height={20} fill="#fff" opacity={0.36} />
        <path d="M20 0 V40 M0 20 H40" stroke={T} strokeWidth={0.9} strokeDasharray="2.4 1.8" />
      </pattern>
      <linearGradient id={`sh${uid}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity={0.24} />
        <stop offset="0.45" stopColor="#fff" stopOpacity={0} />
        <stop offset="1" stopColor="#000" stopOpacity={0.24} />
      </linearGradient>
    </>
  )
}

/** The product drawing itself (no background), in a 200×200 box. Needs <MockDefs> with the same uid in the SVG. */
export function MockArt({ uid, shape, material, colour, patch, noBack }: MockSpec & { uid: string; noBack?: boolean }) {
  const { D, T } = mockPaint(colour, material)
  const fab = `fab${uid}`
  const F = `url(#${patch ? `pat${uid}` : fab})`
  const st = (d: string, key?: string | number) => (
    <path key={`st-${key}`} d={d} fill="none" stroke={T} strokeWidth={1.1} strokeDasharray="3 2.4" strokeLinecap="round" />
  )
  const strap = (d: string, w: number, key?: string | number) => (
    <g key={key}>
      <path d={d} fill="none" stroke={D} strokeWidth={w + 1.8} strokeLinecap="round" />
      <path d={d} fill="none" stroke={`url(#${fab})`} strokeWidth={w} strokeLinecap="round" />
    </g>
  )
  const def = SHAPES[shape]({ F, D, T, st, strap })
  const rule = def.evenodd ? 'evenodd' : undefined
  return (
    <>
      {!noBack && def.back}
      <g transform={def.transform}>
        {def.body.map((d, i) => (
          <path key={`b${i}`} d={d} fill={F} fillRule={rule} stroke={D} strokeWidth={1.2} strokeLinejoin="round" />
        ))}
        {def.body.map((d, i) => (
          <path key={`s${i}`} d={d} fill={`url(#sh${uid})`} fillRule={rule} />
        ))}
        {def.front}
      </g>
    </>
  )
}

export function ProductMock({ shape, material, colour, patch, className = '', style, title }: MockSpec & { className?: string; style?: CSSProperties; title?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const bg = `bg${uid}`
  const blur = `bl${uid}`

  return (
    <div className={`mock ${className}`} style={style} role="img" aria-label={title ?? shape}>
      <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <defs>
          <radialGradient id={bg} cx="50%" cy="38%" r="75%">
            <stop offset="0" stopColor="#f7f5f0" />
            <stop offset="1" stopColor="#e4e0d7" />
          </radialGradient>
          <MockDefs uid={uid} material={material} colour={colour} />
          <filter id={blur} x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        <rect width={200} height={200} fill={`url(#${bg})`} />
        <ellipse cx={100} cy={178} rx={64} ry={7} fill="#000" opacity={0.16} filter={`url(#${blur})`} />
        <MockArt uid={uid} shape={shape} material={material} colour={colour} patch={patch} />
      </svg>
    </div>
  )
}

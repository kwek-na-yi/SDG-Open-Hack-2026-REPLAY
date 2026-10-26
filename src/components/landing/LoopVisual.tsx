import { useEffect, useState } from 'react'

const STAGES = [
  { t: 'SECOND-HAND', v: 'S$8', c: 'What a pre-owned jacket fetches in bulk' },
  { t: 'AI VALUE ENGINE', v: 'S$63', c: 'Highest-value next life identified' },
  { t: 'DISCOVER', v: 'S$25', c: 'Bought pre-owned by a consumer' },
  { t: 'TRANSFORM', v: 'S$63', c: 'Reworked by a local creator' },
  { t: 'RESELL', v: 'S$63', c: 'Sold to a new owner' },
  { t: 'EARN', v: '+S$20', c: 'Profit to the consumer, fees to the creator' },
  { t: 'NEXT LIFE', v: 'S$12', c: 'Material recovery at end of life' },
]

export default function LoopVisual() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % STAGES.length), 1600)
    return () => clearInterval(id)
  }, [])

  const size = 480
  const cx = size / 2
  const cy = size / 2
  const r = 168
  const pts = STAGES.map((_, i) => {
    const a = (i / STAGES.length) * Math.PI * 2 - Math.PI / 2
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), a }
  })
  const arcLen = (2 * Math.PI * r) / STAGES.length

  return (
    <svg className="loop-svg" viewBox={`-80 -10 ${size + 160} ${size + 20}`} width="100%" style={{ maxWidth: 560, margin: '0 auto', display: 'block' }} role="img" aria-label="Circular value loop">
      <defs>
        <linearGradient id="arcg" x1="0" x2="1">
          <stop offset="0" stopColor="#D9C6F7" stopOpacity="0" />
          <stop offset="1" stopColor="#D9C6F7" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#4F377A" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={r - 46} fill="none" stroke="#3E2768" strokeWidth="1" strokeDasharray="2 6" />
      {/* progress arc to the active node */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#D9C6F7"
        strokeWidth="2"
        strokeDasharray={`${arcLen * active + 0.01} ${2 * Math.PI * r}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: active === 0 ? 'none' : 'stroke-dasharray 1.2s cubic-bezier(.2,.8,.2,1)' }}
        opacity={0.8}
      />
      <circle r="4" fill="#D9C6F7">
        <animateMotion dur="11.2s" repeatCount="indefinite" path={`M ${cx} ${cy - r} a ${r} ${r} 0 1 1 -0.01 0`} />
      </circle>

      {pts.map((p, i) => {
        const on = i === active
        const done = i < active
        const lx = cx + (r + 34) * Math.cos(p.a)
        const ly = cy + (r + 34) * Math.sin(p.a)
        const anchor = Math.abs(Math.cos(p.a)) < 0.2 ? 'middle' : Math.cos(p.a) > 0 ? 'start' : 'end'
        return (
          <g key={i} className="loop-node">
            {on && <circle cx={p.x} cy={p.y} r="16" fill="#D9C6F7" opacity="0.15" />}
            <circle cx={p.x} cy={p.y} r={on ? 8 : 5.5} fill={on || done ? '#D9C6F7' : '#2f1b52'} stroke={on || done ? '#D9C6F7' : '#6E5596'} strokeWidth="1.5" style={{ transition: 'all .4s' }} />
            <text x={lx} y={ly + 4} textAnchor={anchor} fontSize="11" letterSpacing="1.2" fill={on ? '#fff' : '#A68BC9'} fontWeight={on ? 600 : 400} style={{ transition: 'fill .4s' }}>
              {STAGES[i].t}
            </text>
          </g>
        )
      })}

      <text x={cx} y={cy - 38} textAnchor="middle" fontSize="10.5" letterSpacing="2" fill="#A68BC9">
        {String(active + 1).padStart(2, '0')} / 07 · {STAGES[active].t}
      </text>
      <text key={active} x={cx} y={cy + 16} textAnchor="middle" fontSize="52" fontWeight="800" fill="#fff" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-2px', animation: 'fade .5s ease' }}>
        {STAGES[active].v}
      </text>
      <text x={cx} y={cy + 44} textAnchor="middle" fontSize="11.5" fill="#C3B0E2" style={{ fontFamily: 'Inter, sans-serif' }}>
        {STAGES[active].c}
      </text>
    </svg>
  )
}

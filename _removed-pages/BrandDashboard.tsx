import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, AlertTriangle, ArrowUpRight, Cpu, Layers, Recycle, TrendingUp } from 'lucide-react'
import { CountUp, Kpi, ProductImage, SimTag, sgd } from '../components/ui'
import { CHANNEL_MIX, END_OF_SEASON, INVENTORY_BY_CATEGORY, MONTHLY_RECOVERED } from '../lib/data'
import { CHANNEL_COLORS } from '../lib/engine'
import { useStore } from '../lib/store'

const BASELINE_RECOVERED = 126240
const AXIS = { fontSize: 11, fill: '#6a6f6c' }
const GRID = '#eeeeea'
const NEUTRAL = '#c9ccc9'
const k = (v: number) => (v >= 1000 ? `S$${Math.round(v / 1000)}k` : `S$${v}`)

type TipPayload = { name?: string; value?: number; color?: string; dataKey?: string | number; payload?: Record<string, unknown> }
function Tip({ active, payload, label }: { active?: boolean; payload?: TipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tip">
      <div className="strong" style={{ marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="row" style={{ gap: 8, justifyContent: 'space-between' }}>
          <span className="row" style={{ gap: 6 }}>
            <i style={{ width: 8, height: 8, borderRadius: 2, background: p.color, display: 'inline-block' }} />
            <span style={{ color: '#b3bab6' }}>{p.name}</span>
          </span>
          <b className="num">{sgd(Number(p.value))}</b>
        </div>
      ))}
    </div>
  )
}

export default function BrandDashboard() {
  const { state } = useStore()
  const nav = useNavigate()
  const b = state.brand
  const gained = b.recovered - BASELINE_RECOVERED
  const monthly = MONTHLY_RECOVERED.map((m, i) => (i === MONTHLY_RECOVERED.length - 1 ? { ...m, recovered: m.recovered + Math.max(0, gained) } : m))
  const categories = INVENTORY_BY_CATEGORY.map((c) => {
    const extra = b.pipeline && c.category === 'T-shirts' ? Math.min(c.atRisk - c.allocated, 94100) : 0
    return { category: c.category, allocated: c.allocated + extra, remaining: c.atRisk - c.allocated - extra }
  })

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <div className="row" style={{ gap: 8, marginBottom: 10 }}>
            <span className="badge badge-dark">NOVAWEAR</span>
            <span className="eyebrow">12,430 SKUs tracked · Singapore</span>
          </div>
          <h1 className="title">Brand Command Center</h1>
          <p className="subtitle">Recover maximum value from inventory that would otherwise lose it.</p>
        </div>
        <div className="row wrap">
          <SimTag>Simulated brand data</SimTag>
          <button className="btn btn-accent btn-lg" onClick={() => nav('/business?source=novawear')}>
            <Cpu size={16} /> Analyse Inventory
          </button>
        </div>
      </div>

      <div className="grid g4">
        <Kpi
          label="Inventory at Risk"
          icon={<AlertTriangle size={13} />}
          value={<CountUp value={b.atRisk} />}
          delta={b.pipeline ? `−${sgd(b.pipeline.originalValue)} allocated to RE:PLAY` : '10,000 units hit end-of-season in 12 days'}
          tone={b.pipeline ? 'up' : 'down'}
        />
        <Kpi
          label="Value Recovered"
          icon={<TrendingUp size={13} />}
          value={<CountUp value={b.recovered} />}
          delta={gained > 0 ? `+${sgd(gained)} since this session started` : '+18.4% vs. last quarter'}
          flash={gained > 0}
        />
        <Kpi label="Products Recirculated" icon={<Recycle size={13} />} value={<CountUp value={b.recirculated} format={(n) => Math.round(n).toLocaleString()} />} delta="Kept out of landfill & liquidation" />
        <Kpi label="Recovery Rate" icon={<Layers size={13} />} value={<CountUp value={b.recoveryRate} format={(n) => `${Math.round(n)}%`} />} delta="vs. 23% via liquidation" />
      </div>

      {b.pipeline && (
        <div className="card mt16 fade-in" style={{ borderColor: 'var(--accent)' }}>
          <div className="card-head">
            <div>
              <div className="card-title">Active recovery pipeline — {b.pipeline.label}</div>
              <div className="card-sub">
                {b.pipeline.units.toLocaleString()} units · {sgd(b.pipeline.originalValue)} retail value · applied {new Date(b.pipeline.appliedAt).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="right">
              <div style={{ fontSize: 24, fontWeight: 850, color: 'var(--accent-ink)' }}>{sgd(b.pipeline.total)}</div>
              <div className="tiny muted">projected recovery · +{sgd(b.pipeline.total - b.pipeline.liquidation)} vs liquidation</div>
            </div>
          </div>
          <div className="card-body">
            <div className="split-bar" style={{ height: 30 }}>
              {b.pipeline.channels.map((c, i) => (
                <div key={c.label} style={{ flexGrow: c.units, background: CHANNEL_COLORS[i], color: i < 2 ? '#fff' : '#0b0d0c' }}>
                  {c.label} · {sgd(c.revenue)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid g2 mt16">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Inventory value by category</div>
              <div className="card-sub">Retail value at risk, split by RE:PLAY allocation</div>
            </div>
            <div className="legend">
              <span><i style={{ background: CHANNEL_COLORS[0] }} />Allocated</span>
              <span><i style={{ background: NEUTRAL }} />Unallocated</span>
            </div>
          </div>
          <div className="card-body" style={{ height: 240 }}>
            <ResponsiveContainer width="99%" height="100%">
              <BarChart data={categories} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 0 }} barCategoryGap={10}>
                <CartesianGrid horizontal={false} stroke={GRID} />
                <XAxis type="number" tickFormatter={k} tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="category" tick={AXIS} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<Tip />} cursor={{ fill: 'rgba(11,13,12,.04)' }} />
                <Bar dataKey="allocated" name="Allocated" stackId="a" fill={CHANNEL_COLORS[0]} stroke="#fff" strokeWidth={1} isAnimationActive={false} />
                <Bar isAnimationActive={false} dataKey="remaining" name="Unallocated" stackId="a" fill={NEUTRAL} stroke="#fff" strokeWidth={1} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Recovery channel distribution</div>
              <div className="card-sub">Monthly recovered revenue by channel</div>
            </div>
            <div className="legend">
              {['Resale', 'Listings', 'Creator', 'Material'].map((l, i) => (
                <span key={l}><i style={{ background: CHANNEL_COLORS[i] }} />{l}</span>
              ))}
            </div>
          </div>
          <div className="card-body" style={{ height: 240 }}>
            <ResponsiveContainer width="99%" height="100%">
              <BarChart data={CHANNEL_MIX} margin={{ left: -8, right: 8, top: 4, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={k} tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} cursor={{ fill: 'rgba(11,13,12,.04)' }} />
                <Bar isAnimationActive={false} dataKey="resale" name="Premium resale" stackId="c" fill={CHANNEL_COLORS[0]} stroke="#fff" strokeWidth={1} />
                <Bar isAnimationActive={false} dataKey="drops" name="Marketplace listings" stackId="c" fill={CHANNEL_COLORS[1]} stroke="#fff" strokeWidth={1} />
                <Bar isAnimationActive={false} dataKey="creator" name="Creator" stackId="c" fill={CHANNEL_COLORS[2]} stroke="#fff" strokeWidth={1} />
                <Bar isAnimationActive={false} dataKey="material" name="Material" stackId="c" fill={CHANNEL_COLORS[3]} stroke="#fff" strokeWidth={1} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Monthly recovered revenue</div>
              <div className="card-sub">RE:PLAY vs. what liquidation would have paid</div>
            </div>
            <div className="legend">
              <span><i style={{ background: CHANNEL_COLORS[0] }} />RE:PLAY</span>
              <span><i style={{ background: '#9aa29d' }} />Liquidation</span>
            </div>
          </div>
          <div className="card-body" style={{ height: 240 }}>
            <ResponsiveContainer width="99%" height="100%">
              <LineChart data={monthly} margin={{ left: -8, right: 16, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={k} tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} cursor={{ stroke: '#0b0d0c', strokeDasharray: '3 3' }} />
                <Line isAnimationActive={false} type="monotone" dataKey="liquidation" name="Liquidation" stroke="#9aa29d" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                <Line isAnimationActive={false} type="monotone" dataKey="recovered" name="RE:PLAY recovered" stroke={CHANNEL_COLORS[0]} strokeWidth={2} dot={{ r: 4, fill: CHANNEL_COLORS[0], stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Products approaching end-of-season</div>
              <div className="card-sub">Value decays ~4% per week after season end</div>
            </div>
            <span className="badge badge-warn">{END_OF_SEASON.length} SKUs</span>
          </div>
          <div>
            {END_OF_SEASON.map((p, i) => {
              const handled = i === 0 && !!b.pipeline
              return (
                <div key={p.sku} className="tx-row" style={{ gridTemplateColumns: '40px 1fr 110px auto' }}>
                  <ProductImage src={p.img} alt={p.name} style={{ width: 40, height: 40, borderRadius: 7 }} />
                  <div>
                    <div className="strong small">{p.name}</div>
                    <div className="tiny muted mono">
                      {p.sku} · {p.units.toLocaleString()} units · {sgd(p.value)}
                    </div>
                  </div>
                  <div>
                    <div className="tiny muted">{handled ? 'Allocated' : `${p.days} days left`}</div>
                    <div className="bar mt8" style={{ height: 5 }}>
                      <span style={{ width: handled ? '100%' : `${100 - (p.days / 60) * 100}%`, background: handled ? CHANNEL_COLORS[2] : p.days < 20 ? 'var(--warn)' : 'var(--ink)' }} />
                    </div>
                  </div>
                  {handled ? (
                    <span className="badge badge-accent">In pipeline</span>
                  ) : (
                    <button className="btn btn-outline btn-sm" onClick={() => nav(i === 0 ? '/business?source=novawear' : '/business')}>
                      Analyse
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="card mt16">
        <div className="card-head">
          <div className="card-title row" style={{ gap: 8 }}>
            <Activity size={15} /> Live recovery events
          </div>
          <span className="small muted">Every consumer & creator action flows back here</span>
        </div>
        <div>
          {b.events.slice(0, 6).map((e) => (
            <div key={e.id} className="tx-row fade-in" style={{ gridTemplateColumns: '28px 1fr auto auto' }}>
              <ArrowUpRight size={16} className="accent" />
              <span>{e.text}</span>
              <span className="small muted">{new Date(e.at).toLocaleString('en-SG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              <b className="num accent">+{sgd(e.amount)}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

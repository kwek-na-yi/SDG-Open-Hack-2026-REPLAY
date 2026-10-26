import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, Cpu, Play, RotateCcw } from 'lucide-react'
import { CountUp, PageHead, SimTag, sgd } from '../components/ui'
import { allocateInventory, CHANNEL_COLORS, CHANNEL_TEXT, type Category, type Material, type ProductInput } from '../lib/engine'
import { useStore } from '../lib/store'

type Input = ProductInput & { inventoryQuantity: number; label: string }

const PRESETS: Input[] = [
  { label: '10,000 surplus cotton T-shirts', brand: 'NOVAWEAR', originalPrice: 40, condition: 0.85, category: 'shirt', demand: 0.7, material: 'cotton', age: 0.5, inventoryQuantity: 10000 },
  { label: '3,200 returned denim jeans', brand: 'LOOPFORM', originalPrice: 89, condition: 0.75, category: 'denim', demand: 0.65, material: 'denim', age: 0.4, inventoryQuantity: 3200 },
  { label: '1,850 discontinued sneakers', brand: 'URBAN/01', originalPrice: 140, condition: 0.95, category: 'sneaker', demand: 0.8, material: 'blend', age: 0.3, inventoryQuantity: 1850 },
  { label: '640 end-of-season knitwear', brand: 'THREADLAB', originalPrice: 79, condition: 0.9, category: 'knitwear', demand: 0.45, material: 'wool', age: 0.6, inventoryQuantity: 640 },
]

const STEPS = ['Analysing inventory', 'Checking demand', 'Estimating resale value', 'Calculating transformation potential', 'Comparing recovery channels']
const COLORS = CHANNEL_COLORS
const CATEGORIES: Category[] = ['shirt', 'hoodie', 'jacket', 'denim', 'sneaker', 'bag', 'knitwear', 'trousers']
const MATERIALS: Material[] = ['cotton', 'denim', 'polyester', 'leather', 'wool', 'nylon', 'blend']

function Slider({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint: (v: number) => string }) {
  return (
    <div className="field">
      <label>
        <span>{label}</span>
        <span className="muted mono">{hint(value)}</span>
      </label>
      <input type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  )
}

export default function Engine() {
  const [params] = useSearchParams()
  const { state, applyAllocation } = useStore()
  const [input, setInput] = useState<Input>(PRESETS[0])
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [step, setStep] = useState(0)
  const map = useMemo(() => allocateInventory(input), [input])
  const applied = state.brand.pipeline?.label === input.label

  const run = () => {
    setPhase('running')
    setStep(0)
  }

  useEffect(() => {
    if (params.get('source') === 'novawear') run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (phase !== 'running') return
    const timers = STEPS.map((_, i) => setTimeout(() => setStep(i + 1), 650 * (i + 1)))
    timers.push(setTimeout(() => setPhase('done'), 650 * STEPS.length + 350))
    return () => timers.forEach(clearTimeout)
  }, [phase])

  const set = (patch: Partial<Input>) => {
    setInput((i) => ({ ...i, ...patch, label: patch.label ?? (i.label.startsWith('Custom') ? i.label : `Custom — ${i.label}`) }))
    if (phase === 'done') setPhase('idle')
  }

  const maxBar = Math.max(map.totalRecovery, map.liquidationTotal)

  return (
    <div className="container page">
      <PageHead
        display
        eyebrow="For Business · The technology"
        title="AI Value Engine"
        subtitle="Describe a batch of surplus stock. The engine values every unit across four recovery channels and recommends the revenue-maximising split."
        right={<SimTag>Deterministic prototype model — no API key needed</SimTag>}
      />

      <div className="grid stack-md" style={{ gridTemplateColumns: 'minmax(0, 360px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        {/* INPUT */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Inventory input</div>
            <span className="badge">{input.brand}</span>
          </div>
          <div className="card-body stack gap16">
            <div className="field">
              <label>Preset batch</label>
              <select
                className="input"
                value={PRESETS.findIndex((p) => p.label === input.label)}
                onChange={(e) => {
                  setInput(PRESETS[Number(e.target.value)])
                  setPhase('idle')
                }}
              >
                {input.label.startsWith('Custom') && <option value={-1}>{input.label}</option>}
                {PRESETS.map((p, i) => (
                  <option key={p.label} value={i}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid g2" style={{ gap: 12, gridTemplateColumns: '1fr 1fr' }}>
              <div className="field">
                <label>Units</label>
                <input className="input num" type="number" min={1} value={input.inventoryQuantity} onChange={(e) => set({ inventoryQuantity: Math.max(1, Number(e.target.value) || 1) })} />
              </div>
              <div className="field">
                <label>Retail price ($)</label>
                <input className="input num" type="number" min={1} value={input.originalPrice} onChange={(e) => set({ originalPrice: Math.max(1, Number(e.target.value) || 1) })} />
              </div>
              <div className="field">
                <label>Category</label>
                <select className="input" value={input.category} onChange={(e) => set({ category: e.target.value as Category })}>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Material</label>
                <select className="input" value={input.material} onChange={(e) => set({ material: e.target.value as Material })}>
                  {MATERIALS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <Slider label="Condition" value={input.condition} onChange={(v) => set({ condition: v })} hint={(v) => `${Math.round(v * 100)}%`} />
            <Slider label="Market demand" value={input.demand} onChange={(v) => set({ demand: v })} hint={(v) => `${Math.round(v * 100)}%`} />
            <Slider label="Age" value={input.age} onChange={(v) => set({ age: v })} hint={(v) => (v < 0.2 ? 'current season' : `${(v * 3).toFixed(1)} seasons`)} />
            <button className="btn btn-primary btn-lg btn-block" onClick={run} disabled={phase === 'running'}>
              {phase === 'done' ? <RotateCcw size={16} /> : <Play size={16} />} {phase === 'done' ? 'Re-run analysis' : phase === 'running' ? 'Analysing…' : 'Analyse Inventory'}
            </button>
          </div>
        </div>

        {/* OUTPUT */}
        <div className="stack gap16">
          {phase === 'idle' && (
            <div className="card card-pad stack" style={{ minHeight: 420, justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--ink)', color: 'var(--accent-bright)', display: 'grid', placeItems: 'center' }}>
                <Cpu size={26} />
              </div>
              <h3 style={{ fontSize: 20 }}>Product: “{input.label.replace('Custom — ', '')}”</h3>
              <p className="muted" style={{ maxWidth: 420 }}>
                {input.inventoryQuantity.toLocaleString()} units × {sgd(input.originalPrice)} = <b>{sgd(input.inventoryQuantity * input.originalPrice)}</b> of inventory at risk of liquidation. Run the engine to find its highest-value next lives.
              </p>
              <button className="btn btn-accent" onClick={run}>
                <Play size={15} /> Analyse Inventory
              </button>
            </div>
          )}

          {phase === 'running' && (
            <div className="card card-pad stack" style={{ minHeight: 420, justifyContent: 'center', gap: 22, padding: 36 }}>
              <div>
                <div className="eyebrow">
                  <span className="dot" /> Processing {input.inventoryQuantity.toLocaleString()} units
                </div>
                <h3 className="mt8" style={{ fontSize: 22 }}>{input.label.replace('Custom — ', '')}</h3>
              </div>
              <div className="check-list">
                {STEPS.map((s, i) => (
                  <div key={s} className={`check-item ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                    <span className="ci">{i < step && <Check size={13} />}</span>
                    {i + 1}. {s}
                    {i < step && (
                      <span className="small muted mono" style={{ marginLeft: 'auto' }}>
                        {['sku mix ok', `demand ${Math.round(input.demand * 100)}%`, `${sgd(map.unit.resaleValue)}/unit`, `${sgd(map.unit.transformationValue)}/unit`, '4 channels'][i]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="bar accent">
                <span style={{ width: `${(step / STEPS.length) * 100}%` }} />
              </div>
            </div>
          )}

          {phase === 'done' && (
            <>
              <div className="card fade-in">
                <div className="card-head">
                  <div>
                    <div className="card-title" style={{ fontSize: 16 }}>Value Map</div>
                    <div className="card-sub">{input.label.replace('Custom — ', '')} · {input.brand}</div>
                  </div>
                  <span className="badge badge-accent">Recommended allocation</span>
                </div>
                <div className="card-body" style={{ paddingBottom: 6 }}>
                  <div className="split-bar">
                    {map.allocations.map((a, i) => (
                      <div key={a.channel} style={{ flexGrow: Math.max(a.units, 1), background: COLORS[i], color: CHANNEL_TEXT[i] }} title={a.label}>
                        {Math.round((a.units / input.inventoryQuantity) * 100)}%
                      </div>
                    ))}
                  </div>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Channel</th>
                      <th className="r">Units</th>
                      <th className="r">Net / unit</th>
                      <th className="r">Est. Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {map.allocations.map((a, i) => (
                      <tr key={a.channel}>
                        <td>
                          <div className="row" style={{ gap: 10 }}>
                            <i style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[i], flex: 'none' }} />
                            <div>
                              <div className="strong">{a.label}</div>
                              <div className="tiny muted">{a.rationale}</div>
                            </div>
                          </div>
                        </td>
                        <td className="r">{a.units.toLocaleString()}</td>
                        <td className="r muted">{sgd(a.perUnit, 2)}</td>
                        <td className="r strong">{sgd(a.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Total estimated recovery</td>
                      <td className="r">{input.inventoryQuantity.toLocaleString()}</td>
                      <td />
                      <td className="r accent" style={{ fontSize: 16 }}>{sgd(map.totalRecovery)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="grid g2 fade-in">
                <div className="card card-dark card-pad stack gap12">
                  <div className="eyebrow" style={{ color: '#8b938e' }}>Total estimated recovery</div>
                  <div style={{ fontSize: 52, fontWeight: 850, letterSpacing: '-0.045em', color: 'var(--accent-bright)', lineHeight: 1 }}>
                    <CountUp from={0} value={map.totalRecovery} duration={1200} />
                  </div>
                  <div className="stack gap4 small">
                    <div className="row between">
                      <span className="muted">Original inventory value</span>
                      <span className="num">{sgd(map.originalValue)}</span>
                    </div>
                    <div className="row between">
                      <span className="muted">Potential recovered value</span>
                      <span className="num">{sgd(map.totalRecovery)}</span>
                    </div>
                    <div className="row between">
                      <span className="muted">Recovery rate</span>
                      <span className="num">{(map.recoveryRate * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                <div className="card card-pad stack gap12">
                  <div className="card-title">Liquidation vs. RE:PLAY</div>
                  <div>
                    <div className="row between small">
                      <span className="muted">Traditional liquidation</span>
                      <b className="num">{sgd(map.liquidationTotal)}</b>
                    </div>
                    <div className="bar mt8" style={{ height: 14 }}>
                      <span style={{ width: `${(map.liquidationTotal / maxBar) * 100}%`, background: '#9aa29d' }} />
                    </div>
                  </div>
                  <div>
                    <div className="row between small">
                      <span className="strong">RE:PLAY strategy</span>
                      <b className="num accent">{sgd(map.totalRecovery)}</b>
                    </div>
                    <div className="bar accent mt8" style={{ height: 14 }}>
                      <span style={{ width: `${(map.totalRecovery / maxBar) * 100}%` }} />
                    </div>
                  </div>
                  <div className="row between" style={{ background: 'var(--accent-soft)', padding: '12px 14px', borderRadius: 8, marginTop: 'auto' }}>
                    <span className="strong" style={{ color: 'var(--accent-ink)' }}>Difference</span>
                    <span style={{ fontSize: 24, fontWeight: 850, color: 'var(--accent-ink)' }}>
                      {map.difference >= 0 ? '+' : ''}
                      {sgd(map.difference)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid fade-in stack-md" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
                <div className="card">
                  <div className="card-head">
                    <div className="card-title mono" style={{ fontSize: 12.5 }}>calculateCircularValue(unit)</div>
                    <span className="badge">per unit</span>
                  </div>
                  <pre className="mono" style={{ margin: 0, padding: 16, fontSize: 12, lineHeight: 1.6, overflow: 'auto', background: 'var(--surface-2)' }}>
                    {JSON.stringify(map.unit, null, 2)}
                  </pre>
                </div>
                <div className="card card-pad stack gap12">
                  <div className="card-title">Next step</div>
                  <p className="muted small">Applying the allocation routes units into RE:PLAY channels: premium resale, pre-owned marketplace listings, creator material lots and graded fibre recovery.</p>
                  {applied ? (
                    <span className="badge badge-accent" style={{ alignSelf: 'flex-start' }}>
                      <Check size={12} /> Allocation applied
                    </span>
                  ) : (
                    <button className="btn btn-accent btn-lg" onClick={() => applyAllocation(map, input.label)}>
                      Apply recommended allocation <ArrowRight size={15} />
                    </button>
                  )}
                  <p className="tiny faint">Model: category retention × condition × demand × age × brand premium; material workability; graded fibre value. See src/lib/engine.ts.</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

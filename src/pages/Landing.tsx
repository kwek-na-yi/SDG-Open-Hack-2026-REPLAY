import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, Palette, ShoppingBag } from 'lucide-react'
import LoopVisual from '../components/landing/LoopVisual'
import { CountUp, SimTag } from '../components/common/ui'
import { sgd } from '../lib/format'
import { allocateInventory, CHANNEL_COLORS, CHANNEL_TEXT } from '../lib/engine'

const DEMO_BATCH = allocateInventory({ originalPrice: 40, condition: 0.85, category: 'shirt', demand: 0.7, material: 'cotton', age: 0.5, brand: 'NOVAWEAR', inventoryQuantity: 10000 })
const SPLIT_COLORS = CHANNEL_COLORS

export default function Landing() {
  const nav = useNavigate()

  return (
    <>
      <section className="hero">
        <div className="grid-bg" />
        <div className="container" style={{ position: 'relative' }}>
          <div className="hero-grid">
            <div>
              <div className="eyebrow">
                <span className="dot" /> Circular Commerce · AI Value Recovery
              </div>
              <h1 style={{ marginTop: 18 }}>
                What if waste was actually <em>undervalued?</em>
              </h1>
              <p className="lead">RE:PLAY uses AI to discover the hidden value inside second-hand and unwanted clothing — then shows you how to turn it into something worth more.</p>
              <div className="row wrap mt32" style={{ gap: 12 }}>
                <button className="btn btn-lg btn-accent" onClick={() => nav('/discover')}>
                  Explore RE:PLAY <ArrowRight size={16} />
                </button>
              </div>
              <div className="row mt24 small" style={{ color: '#A68BC9', gap: 16 }}>
                <span>Second-hand → AI valuation → Discovery → Transformation → Resale → Profit → Next life</span>
              </div>
            </div>
            <LoopVisual />
          </div>
          <div className="hero-metrics">
            <div>
              <div className="v">
                <CountUp from={0} value={1.2} format={(n) => `S$${n.toFixed(1)}M`} duration={1400} />
              </div>
              <div className="l">value recovered</div>
            </div>
            <div>
              <div className="v">
                <CountUp from={0} value={48320} format={(n) => Math.round(n).toLocaleString()} duration={1400} />
              </div>
              <div className="l">products recirculated</div>
            </div>
            <div>
              <div className="v">
                <CountUp from={0} value={82} format={(n) => `${Math.round(n)}%`} duration={1400} />
              </div>
              <div className="l">average value recovery vs. liquidation baseline</div>
            </div>
          </div>
          <div style={{ paddingBottom: 18 }}>
            <SimTag>Prototype demo metrics</SimTag>
          </div>
        </div>
      </section>

      {/* Circular arbitrage */}
      <section className="section">
        <div className="container">
          <div className="grid g2" style={{ gap: 48, alignItems: 'center' }}>
            <div>
              <div className="eyebrow">
                <span className="dot" /> The USP — Circular Arbitrage
              </div>
              <h2 className="title mt12" style={{ fontSize: 36 }}>
                10,000 unsold shirts aren’t a write-off. They’re {sgd(DEMO_BATCH.totalRecovery)} of mispriced value.
              </h2>
              <p className="subtitle mt16">
                Traditional deadstock goes S$40 retail → clearance → liquidation → waste. RE:PLAY values every unit across four recovery channels and routes each one to its highest-value next life.
              </p>
              <div className="row mt24 wrap">
                <Link to="/discover" className="btn btn-primary">
                  Browse pre-owned <ArrowRight size={15} />
                </Link>
              </div>
            </div>
            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">Value Map — 10,000 cotton T-shirts</div>
                  <div className="card-sub">Original inventory value {sgd(DEMO_BATCH.originalValue)}</div>
                </div>
                <SimTag>AI output</SimTag>
              </div>
              <div className="card-body">
                <div className="split-bar">
                  {DEMO_BATCH.allocations.map((a, i) => (
                    <div key={a.channel} style={{ flexGrow: a.units, background: SPLIT_COLORS[i], color: CHANNEL_TEXT[i] }}>
                      {a.units.toLocaleString()}
                    </div>
                  ))}
                </div>
                <div className="legend mt12">
                  {DEMO_BATCH.allocations.map((a, i) => (
                    <span key={a.channel}>
                      <i style={{ background: SPLIT_COLORS[i] }} />
                      {a.label} · {sgd(a.revenue)}
                    </span>
                  ))}
                </div>
                <div className="divider" />
                <div className="stack gap12">
                  <div>
                    <div className="row between small">
                      <span className="muted">Traditional liquidation</span>
                      <b className="num">{sgd(DEMO_BATCH.liquidationTotal)}</b>
                    </div>
                    <div className="bar mt8">
                      <span style={{ width: `${(DEMO_BATCH.liquidationTotal / DEMO_BATCH.totalRecovery) * 100}%`, background: '#A68BC9' }} />
                    </div>
                  </div>
                  <div>
                    <div className="row between small">
                      <span className="strong">RE:PLAY strategy</span>
                      <b className="num accent">{sgd(DEMO_BATCH.totalRecovery)}</b>
                    </div>
                    <div className="bar accent mt8">
                      <span style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>
                <div className="row between mt16" style={{ background: 'var(--accent-soft)', padding: '12px 14px', borderRadius: 8 }}>
                  <span className="strong" style={{ color: 'var(--accent-ink)' }}>
                    Additional value recovered
                  </span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-ink)' }}>+{sgd(DEMO_BATCH.difference)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three sides */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="row between wrap" style={{ marginBottom: 20 }}>
            <h2 className="title">One engine. Three ways to make money.</h2>
          </div>
          <div className="grid g3">
            {[
              { icon: Building2, who: 'Brands', h: 'Recover revenue from deadstock', p: 'Upload surplus, get an AI Value Map, and route stock to resale, marketplace listings, creators and material recovery.', kpi: 'S$126,240 recovered' },
              { icon: ShoppingBag, who: 'Consumers', h: 'Buy pre-owned. Transform. Earn.', p: 'Buy second-hand pieces at a fraction of retail, then let AI suggest three things each one could become.', kpi: '+152% avg. value uplift', to: '/dashboard', cta: 'Open your dashboard' },
              { icon: Palette, who: 'Creators', h: 'Cheap materials, higher-value products', p: 'Students, tailors and studios turn second-hand clothing and surplus lots into products worth several times the input.', kpi: 'S$1,900 profit per batch' },
            ].map((c) => (
              <div key={c.who} className={`card card-pad stack gap12 ${c.to ? 'card-hover' : ''}`} style={c.to ? { cursor: 'pointer' } : undefined} onClick={c.to ? () => nav(c.to) : undefined}>
                <div className="row between">
                  <span className="badge badge-outline">
                    <c.icon size={12} /> {c.who}
                  </span>
                  <span className="small accent strong">{c.kpi}</span>
                </div>
                <h3 style={{ fontSize: 20 }}>{c.h}</h3>
                <p className="muted">{c.p}</p>
                {c.to && (
                  <Link to={c.to} className="link small row" style={{ gap: 6, marginTop: 'auto' }} onClick={(e) => e.stopPropagation()}>
                    {c.cta} <ArrowRight size={13} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Big message */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container stack gap16">
          <div className="compare">
            <div className="old">
              <div className="eyebrow">Traditional circular economy</div>
              <div className="quote">“Please recycle.”</div>
            </div>
            <div>
              <div className="eyebrow">
                <span className="dot" /> RE:PLAY
              </div>
              <div className="quote">“You can make money from this.”</div>
            </div>
          </div>
          <div className="compare">
            <div className="old">
              <div className="eyebrow">Traditional retail</div>
              <div className="quote" style={{ fontSize: 20 }}>Buy → use → discard</div>
            </div>
            <div>
              <div className="eyebrow">
                <span className="dot" /> RE:PLAY
              </div>
              <div className="quote" style={{ fontSize: 20 }}>Discover → buy → transform → sell → earn → repeat</div>
            </div>
          </div>
          <div className="compare">
            <div className="old">
              <div className="eyebrow">Traditional deadstock</div>
              <div className="quote" style={{ fontSize: 20 }}>A cost</div>
            </div>
            <div>
              <div className="eyebrow">
                <span className="dot" /> RE:PLAY
              </div>
              <div className="quote" style={{ fontSize: 20 }}>Potential revenue</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container stack" style={{ alignItems: 'flex-start', gap: 18 }}>
          <div className="eyebrow" style={{ color: '#A68BC9' }}>
            <span className="dot" /> Turn waste into opportunity
          </div>
          <h2 style={{ fontSize: 44, fontWeight: 850, letterSpacing: '-0.04em', maxWidth: 900 }}>
            We don’t ask people to consume less. We make it more profitable to circulate what already exists.
          </h2>
          <p style={{ color: '#C3B0E2', fontSize: 16 }}>Discover the hidden value in what the world throws away.</p>
          <div className="row wrap mt8">
            <button className="btn btn-lg btn-light" onClick={() => nav('/discover')}>
              Browse pre-owned <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </>
  )
}

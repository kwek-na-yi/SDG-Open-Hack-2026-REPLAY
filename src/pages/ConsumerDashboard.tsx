import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Compass, Fingerprint, RotateCcw, Sparkles, Tag } from 'lucide-react'
import { CountUp, ItemVisual, LifeScore, Modal, ProductImage, SimTag } from '../components/common/ui'
import { sgd } from '../lib/format'
import { PRODUCTS } from '../data/catalog'
import { DELIVERY_FEE, DELIVERY_LABEL } from '../lib/orders'
import type { PortfolioItem } from '../data/demo-account'
import { useStore } from '../store/store'
import { firstName } from '../lib/account'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function ItemActionModal({ mode, onClose }: { mode: 'sell' | 'return' | null; onClose: () => void }) {
  const { state, resellItem, returnItem } = useStore()
  const items = state.portfolio.filter((i) => i.status === 'owned' || i.status === 'transformed')
  const [sel, setSel] = useState<string | null>(null)
  const item = items.find((i) => i.id === sel)
  const close = () => {
    setSel(null)
    onClose()
  }
  return (
    <Modal open={!!mode} onClose={close} title={mode === 'sell' ? 'Sell an item' : 'Return for RE:PLAY Cash'}>
      <p className="muted" style={{ marginBottom: 14 }}>
        {mode === 'sell' ? `RE:PLAY matches you with a buyer at the AI-estimated resale price (10% platform fee + ${sgd(DELIVERY_FEE, 2)} ${DELIVERY_LABEL}).` : 'Get the guaranteed RE:PLAY value instantly. We route the item to its next highest-value life.'}
      </p>
      {items.length === 0 && <div className="empty">No items available.</div>}
      <div className="stack gap8">
        {items.map((i) => (
          <button key={i.id} className={`choice ${sel === i.id ? 'on' : ''}`} onClick={() => setSel(i.id)} style={{ padding: 10 }}>
            <div className="row" style={{ gap: 12 }}>
              <ItemVisual item={i} style={{ width: 48, height: 48, borderRadius: 8, flex: 'none' }} />
              <div style={{ flex: 1 }}>
                <div className="strong">{i.name}</div>
                <div className="small muted">Bought {sgd(i.bought)}</div>
              </div>
              <div className="right">
                <div className="strong num">{mode === 'sell' ? sgd(i.current) : sgd(i.guaranteed)}</div>
                <div className="tiny muted">{mode === 'sell' ? 'est. resale' : 'guaranteed'}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="row mt16" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-outline" onClick={close}>
          Cancel
        </button>
        <button
          className="btn btn-accent"
          disabled={!item}
          onClick={() => {
            if (!item) return
            if (mode === 'sell') resellItem(item.id)
            else returnItem(item.id)
            close()
          }}
        >
          {item ? (mode === 'sell' ? `Sell for ${sgd(item.current)}` : `Return for ${sgd(item.guaranteed)}`) : 'Select an item'}
        </button>
      </div>
    </Modal>
  )
}

function PortfolioCard({ item }: { item: PortfolioItem }) {
  const nav = useNavigate()
  const { state } = useStore()
  const best = Math.max(item.transform, item.resale)
  const uplift = Math.round(((best - item.bought) / item.bought) * 100)
  const t = state.transformations[item.id]
  return (
    <div className="card card-hover fade-in stack-sm" style={{ display: 'grid', gridTemplateColumns: '150px 1fr', overflow: 'hidden' }}>
      <ItemVisual item={item} style={{ height: '100%', minHeight: 190 }} />
      <div className="card-pad stack gap12">
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="pcard-brand">
              {item.brand} · {item.acquiredVia}
            </div>
            <div className="pcard-name">{item.name}</div>
          </div>
          {item.status === 'transforming' && <span className="badge badge-gold">Transforming</span>}
          {item.status === 'transformed' && <span className="badge badge-accent">Transformed</span>}
        </div>
        <div className="metric-strip metric-4">
          <div>
            <div className="l">Bought</div>
            <div className="v">{sgd(item.bought)}</div>
          </div>
          <div>
            <div className="l">Current est.</div>
            <div className="v">{sgd(item.current)}</div>
          </div>
          <div>
            <div className="l">Resale</div>
            <div className="v">{sgd(item.resale)}</div>
          </div>
          <div>
            <div className="l">Transformed</div>
            <div className="v accent">{sgd(item.transform)}</div>
          </div>
        </div>
        <div className="row between wrap">
          <LifeScore score={item.lifeScore} />
          <span className="small up strong">
            <ArrowUpRight size={12} style={{ verticalAlign: -2 }} /> +{uplift}% potential
          </span>
        </div>
        <div className="row wrap" style={{ marginTop: 'auto' }}>
          {item.status === 'owned' && (
            <button className="btn btn-primary btn-sm" onClick={() => nav(`/transform/${item.id}`)}>
              Transform with AI <ArrowRight size={13} />
            </button>
          )}
          {(item.status === 'transforming' || item.status === 'transformed') && (
            <button className="btn btn-primary btn-sm" onClick={() => nav(`/transform/${item.id}`)}>
              {item.status === 'transforming' ? `Track ${t?.idea.title ?? 'transformation'}` : 'View & sell'} <ArrowRight size={13} />
            </button>
          )}
          <Link className="btn btn-outline btn-sm" to={`/passport/${item.passportId}`}>
            <Fingerprint size={13} /> Life Passport
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ConsumerDashboard() {
  const { state, balance, user } = useStore()
  const nav = useNavigate()
  const [mode, setMode] = useState<'sell' | 'return' | null>(null)
  const active = state.portfolio.filter((i) => i.status === 'owned' || i.status === 'transforming' || i.status === 'transformed')
  const past = state.portfolio.filter((i) => i.status === 'sold' || i.status === 'returned')
  const portfolioValue = active.reduce((s, i) => s + i.current, 0)
  const costBasis = active.reduce((s, i) => s + i.bought, 0)
  const potential = active.reduce((s, i) => s + Math.max(i.transform, i.resale), 0)
  const earned = state.wallet.filter((t) => t.amount > 0 && t.kind !== 'topup').reduce((s, t) => s + t.amount, 0)
  const featured = PRODUCTS[0]

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            <span className="dot" />
            {new Date().toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <h1 className="title">{greeting()}, {user ? firstName(user.name) : 'there'}</h1>
          <p className="subtitle">Your pre-owned pieces could be worth {sgd(potential - costBasis)} more than you paid — give them a second life.</p>
        </div>
        <SimTag>Demo account</SimTag>
      </div>

      <div className="grid dash-top">
        <div className="card card-dark card-pad stack" style={{ justifyContent: 'space-between', minHeight: 220 }}>
          <div>
            <div className="row between">
              <span className="eyebrow" style={{ color: '#A68BC9' }}>
                RE:PLAY Wallet
              </span>
              <span className="tiny muted mono">SIMULATED</span>
            </div>
            <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.04em', marginTop: 14 }}>
              <CountUp value={balance} format={(n) => sgd(Math.round(n * 100) / 100, 2)} />
            </div>
            <div className="muted small">Available balance</div>
          </div>
          <div className="grid btn-row3 mt16">
            <button className="btn btn-light btn-sm" onClick={() => nav('/discover')}>
              <Compass size={13} /> Discover
            </button>
            <button className="btn btn-dark-outline btn-sm" onClick={() => setMode('sell')}>
              <Tag size={13} /> Sell
            </button>
            <button className="btn btn-dark-outline btn-sm" onClick={() => setMode('return')}>
              <RotateCcw size={13} /> Return
            </button>
          </div>
        </div>

        <div className="grid kpi-3">
          <div className="card kpi">
            <div className="kpi-label">Portfolio value</div>
            <div className="kpi-value">
              <CountUp value={portfolioValue} />
            </div>
            <div className="kpi-delta up">Paid {sgd(costBasis)}</div>
          </div>
          <div className="card kpi">
            <div className="kpi-label">Next-life potential</div>
            <div className="kpi-value accent">
              <CountUp value={potential} />
            </div>
            <div className="kpi-delta up">+{costBasis ? Math.round(((potential - costBasis) / costBasis) * 100) : 0}% vs. cost</div>
          </div>
          <div className="card kpi">
            <div className="kpi-label">Earned via RE:PLAY</div>
            <div className="kpi-value">
              <CountUp value={earned} format={(n) => sgd(Math.round(n * 100) / 100, 2)} />
            </div>
            <div className="kpi-delta up">Resale · returns · rewards</div>
          </div>
          <Link to={`/buy/${featured.id}`} className="card card-hover promo-card" style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '120px 1fr auto', alignItems: 'center', overflow: 'hidden' }}>
            <ProductImage src={featured.img} alt={featured.name} style={{ height: 96 }} />
            <div style={{ padding: '0 18px' }}>
              <div className="row" style={{ gap: 8 }}>
                <span className="badge badge-dark">Featured find</span>
                <span className="badge">{featured.conditionLabel}</span>
              </div>
              <div className="strong mt8" style={{ fontSize: 16 }}>{featured.name}</div>
              <div className="small muted">
                {sgd(featured.price)} + {sgd(DELIVERY_FEE, 2)} {DELIVERY_LABEL} · was {sgd(featured.originalPrice)} · transform up to {sgd(featured.fixed?.transform ?? featured.price)}
              </div>
            </div>
            <span className="btn btn-accent btn-sm" style={{ marginRight: 18 }}>
              <Sparkles size={13} /> Buy now
            </span>
          </Link>
        </div>
      </div>

      <div className="row between mt32" style={{ marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 20 }}>Your Circular Portfolio</h2>
          <div className="small muted">{active.length} items · values estimated by the RE:PLAY valuation model</div>
        </div>
        <Link to="/passport" className="link small">
          All Life Passports →
        </Link>
      </div>
      <div className="grid g2">
        {active.map((i) => (
          <PortfolioCard key={i.id} item={i} />
        ))}
        {active.length === 0 && (
          <div className="card empty" style={{ gridColumn: '1/-1' }}>
            Your collection is empty. <Link className="link" to="/discover">Browse pre-owned clothing</Link> to start.
          </div>
        )}
      </div>

      {past.length > 0 && (
        <>
          <h3 className="mt32" style={{ fontSize: 15, marginBottom: 10 }}>
            Passed on to their next life
          </h3>
          <div className="card">
            {past.map((i) => (
              <div key={i.id} className="tx-row" style={{ gridTemplateColumns: '44px 1fr auto auto' }}>
                <ItemVisual item={i} style={{ width: 44, height: 44, borderRadius: 8 }} />
                <div>
                  <div className="strong">{i.name}</div>
                  <div className="small muted">{i.status === 'sold' ? 'Sold to a new owner' : 'Returned to RE:PLAY'}</div>
                </div>
                <LifeScore score={i.lifeScore} />
                <Link to={`/passport/${i.passportId}`} className="btn btn-ghost btn-sm">
                  Passport
                </Link>
              </div>
            ))}
          </div>
        </>
      )}

      <ItemActionModal mode={mode} onClose={() => setMode(null)} />
    </div>
  )
}

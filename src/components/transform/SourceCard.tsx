import type { ReactNode } from 'react'
import type { PortfolioItem } from '../../data/demo-account'
import type { GarmentProfile } from '../../lib/ideas'
import { ItemVisual, SimTag } from '../common/ui'
import { sgd } from '../../lib/format'
import { cap, conditionWord } from './format'

/** The owned garment and the (simulated) AI read-out of its attributes. */
export default function SourceCard({ item, p, analysing }: { item: PortfolioItem; p: GarmentProfile; analysing: boolean }) {
  const attrs: [string, ReactNode][] = [
    ['Category', cap(p.garment)],
    ['Material', cap(p.material)],
    [
      'Colour',
      <span key="c" className="row" style={{ gap: 6 }}>
        <i className="swatch" style={{ background: p.colourHex }} /> {p.colourName}
      </span>,
    ],
    ['Size', p.size],
    ['Condition', conditionWord(p.conditionLabel)],
    ['Pattern', p.pattern],
    ['Brand', p.brand],
    ['Style', p.style],
  ]
  return (
    <div className="card source-card">
      <div className="source-visual">
        <ItemVisual item={{ ...item, mock: undefined }} style={{ position: 'absolute', inset: 0 }} />
        {analysing && <div className="scanline" />}
        <span className="badge badge-dark source-badge">Second-hand · Pre-owned</span>
      </div>
      <div className="card-pad stack gap12" style={{ minWidth: 0 }}>
        <div className="row between wrap" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="pcard-brand">Your raw material · {item.acquiredVia}</div>
            <h2 style={{ fontSize: 22, marginTop: 4 }}>Second-hand {p.garment}</h2>
            <div className="small muted mt8">This isn’t the end product. It’s raw material for something new.</div>
          </div>
          <div className="right">
            <div className="tiny muted">You paid</div>
            <div style={{ fontSize: 24, fontWeight: 850, letterSpacing: '-0.03em' }}>{sgd(p.acquisition, p.shippingIn ? 2 : undefined)}</div>
            {p.shippingIn > 0 && <div className="tiny muted">incl. {sgd(p.shippingIn, 2)} delivery</div>}
          </div>
        </div>
        <div>
          <div className="row between wrap" style={{ marginBottom: 8, gap: 8 }}>
            <span className="eyebrow">
              <span className="dot" /> {analysing ? 'AI is reading your garment…' : 'AI analysis'}
            </span>
            <SimTag>Simulated vision model</SimTag>
          </div>
          <div className="attr-grid">
            {attrs.map(([k, v], i) => (
              <div key={k} className={`attr ${analysing ? 'attr-in' : ''}`} style={{ animationDelay: `${i * 0.12}s` }}>
                <div className="l">{k}</div>
                <div className="v">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MapPin, Star } from 'lucide-react'
import { Modal, PageHead, ProductImage, SimTag, sgd } from '../components/ui'
import { CREATORS, MATERIAL_LOTS, type Creator } from '../lib/data'

function TransformationModal({ c, onClose }: { c: Creator | null; onClose: () => void }) {
  if (!c) return null
  const profit = c.expectedSales - c.materialCost
  const multiple = c.expectedSales / c.materialCost
  return (
    <Modal open onClose={onClose} title={`${c.name} — transformation`} size="lg">
      <div className="grid" style={{ gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center' }}>
        <div>
          <ProductImage src={c.img} alt={c.input} style={{ aspectRatio: '4/3', borderRadius: 10 }} />
          <div className="mt8 small muted">Input</div>
          <div className="strong">
            {c.inputQty} {c.input}
          </div>
          <div className="small">{sgd(c.materialCost)} material cost</div>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--ink)', color: 'var(--accent-bright)', display: 'grid', placeItems: 'center' }}>
          <ArrowRight size={18} />
        </div>
        <div>
          <ProductImage src={c.outputImg} alt={c.output} style={{ aspectRatio: '4/3', borderRadius: 10 }} />
          <div className="mt8 small muted">Output</div>
          <div className="strong">
            {c.outputQty} {c.output}
          </div>
          <div className="small accent strong">{sgd(c.expectedSales)} expected sales</div>
        </div>
      </div>
      <div className="divider" />
      <div className="grid g2">
        <div>
          <div className="card-title" style={{ marginBottom: 10 }}>Process</div>
          <div className="stack gap8">
            {c.steps.map((s, i) => (
              <div key={s} className="row" style={{ gap: 10 }}>
                <span className="rank" style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}>{i + 1}</span>
                {s}
              </div>
            ))}
          </div>
        </div>
        <div className="stack gap8">
          <div className="card-title">Economics</div>
          <div className="row between small"><span className="muted">Material cost</span><b>{sgd(c.materialCost)}</b></div>
          <div className="row between small"><span className="muted">Expected sales</span><b>{sgd(c.expectedSales)}</b></div>
          <div className="row between small"><span className="muted">Value multiple</span><b>{multiple.toFixed(1)}×</b></div>
          <div className="row between" style={{ background: 'var(--accent-soft)', padding: '10px 12px', borderRadius: 8 }}>
            <span className="strong" style={{ color: 'var(--accent-ink)' }}>Projected profit</span>
            <span style={{ fontSize: 22, fontWeight: 850, color: 'var(--accent-ink)' }}>{sgd(profit)}</span>
          </div>
          <Link to="/discover?tab=creator" className="btn btn-outline btn-sm">
            Shop Creator Originals
          </Link>
        </div>
      </div>
    </Modal>
  )
}

export default function Creators() {
  const [open, setOpen] = useState<Creator | null>(null)
  return (
    <div className="container page">
      <PageHead
        display
        eyebrow="Creator marketplace"
        title="Turn surplus into something new"
        subtitle="Students, designers, tailors and studios turn second-hand clothing into new products — buying at material prices, selling at product prices."
        right={<SimTag>Fictional Singapore creators</SimTag>}
      />

      <div className="grid g2">
        {CREATORS.map((c) => {
          const profit = c.expectedSales - c.materialCost
          return (
            <div key={c.id} className="card card-hover" style={{ overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 150 }}>
                <ProductImage src={c.img} alt={c.input} style={{ height: 150 }} />
                <ProductImage src={c.outputImg} alt={c.output} style={{ height: 150 }} />
              </div>
              <div className="card-pad stack gap12">
                <div className="row between">
                  <div>
                    <h3 style={{ fontSize: 19 }}>{c.name}</h3>
                    <div className="small muted row" style={{ gap: 10 }}>
                      <span className="row" style={{ gap: 3 }}><MapPin size={12} /> {c.location}</span>
                      <span className="row" style={{ gap: 3 }}><Star size={12} /> {c.rating}</span>
                      <span>{c.transformations.toLocaleString()} items transformed</span>
                    </div>
                  </div>
                  <span className="badge">{c.specialty}</span>
                </div>
                <div className="row" style={{ gap: 10, background: 'var(--surface-2)', border: '1px solid var(--line-2)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ flex: 1 }}>
                    <div className="tiny muted">Input</div>
                    <div className="strong small">{c.inputQty} {c.input}</div>
                  </div>
                  <ArrowRight size={16} className="accent" />
                  <div style={{ flex: 1 }}>
                    <div className="tiny muted">Output</div>
                    <div className="strong small">{c.outputQty} {c.output}</div>
                  </div>
                </div>
                <div className="metric-strip">
                  <div>
                    <div className="l">Material cost</div>
                    <div className="v">{sgd(c.materialCost)}</div>
                  </div>
                  <div>
                    <div className="l">Expected sales</div>
                    <div className="v">{sgd(c.expectedSales)}</div>
                  </div>
                  <div>
                    <div className="l">Projected profit</div>
                    <div className="v accent">{sgd(profit)}</div>
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setOpen(c)}>
                  View Transformation <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="row between mt32" style={{ marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 20 }}>Surplus material lots</h2>
          <div className="small muted">Allocated to creators by the AI Value Engine from brand deadstock</div>
        </div>
      </div>
      <div className="grid g3">
        {MATERIAL_LOTS.map((l) => (
          <div key={l.id} className="card" style={{ overflow: 'hidden' }}>
            <ProductImage src={l.img} alt={l.name} style={{ height: 140 }} />
            <div className="card-pad stack gap8">
              <div className="pcard-brand">{l.brand}</div>
              <div className="strong">{l.name}</div>
              <div className="tiny muted">{l.note}</div>
              <div className="row between small mt8">
                <span>
                  <b>{sgd(l.price)}</b> <span className="muted">({sgd(l.price / l.units, 2)}/unit)</span>
                </span>
                <span className="accent strong">→ {sgd(l.potential)} potential</span>
              </div>
              <div className="tiny muted mt8">Available to RE:PLAY creator studios</div>
            </div>
          </div>
        ))}
      </div>

      <TransformationModal c={open} onClose={() => setOpen(null)} />
    </div>
  )
}

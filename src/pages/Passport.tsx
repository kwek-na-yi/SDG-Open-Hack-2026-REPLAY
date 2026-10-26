import { Fragment } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Fingerprint, QrCode } from 'lucide-react'
import { ProductMock } from '../components/product/ProductMock'
import { CountUp, LifeScore, PageHead, ProductImage, SimTag } from '../components/common/ui'
import { sgd } from '../lib/format'
import { useStore } from '../store/store'

export function PassportIndex() {
  const { state } = useStore()
  const mine = new Set(state.portfolio.map((i) => i.passportId))
  return (
    <div className="container page">
      <PageHead eyebrow="Second-life tracking" title="Product Life Passports" subtitle="Every RE:PLAY product carries a measurable economic history — not just “recycled”." />
      <div className="grid g3">
        {state.passports.map((p) => {
          const real = p.lives.filter((l) => !l.potential)
          const total = p.lives.reduce((s, l) => s + l.value, 0)
          return (
            <Link key={p.id} to={`/passport/${p.id}`} className="card card-hover" style={{ display: 'grid', gridTemplateColumns: '96px 1fr', overflow: 'hidden' }}>
              {p.mock ? <ProductMock {...p.mock} title={p.name} style={{ height: '100%', minHeight: 110 }} /> : <ProductImage src={p.img} alt={p.name} style={{ height: '100%', minHeight: 110 }} />}
              <div className="card-pad stack gap4">
                <div className="row between">
                  <span className="mono tiny muted">#{p.id}</span>
                  {mine.has(p.id) ? <span className="badge badge-accent">Yours</span> : <span className="badge">Featured</span>}
                </div>
                <div className="strong">{p.name}</div>
                <LifeScore score={Math.min(4, real.length)} />
                <div className="small muted">
                  Total value generated <b style={{ color: 'var(--ink)' }}>{sgd(total)}</b>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default function Passport() {
  const { id } = useParams()
  const { state } = useStore()
  const p = state.passports.find((x) => x.id === id)
  if (!p) {
    return (
      <div className="container page empty">
        Passport not found. <Link to="/passport" className="link">All passports</Link>
      </div>
    )
  }
  const total = p.lives.reduce((s, l) => s + l.value, 0)
  const realized = p.lives.filter((l) => !l.potential).reduce((s, l) => s + l.value, 0)
  const lastReal = p.lives.filter((l) => !l.potential).length

  return (
    <div className="container page" style={{ maxWidth: 1000 }}>
      <PageHead eyebrow="Second-life tracking" title="Product Life Passport" right={<Link to="/passport" className="btn btn-outline btn-sm">All passports</Link>} />

      <div className="card" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', overflow: 'hidden', marginBottom: 20 }}>
        {p.mock ? <ProductMock {...p.mock} title={p.name} style={{ height: '100%', minHeight: 200 }} /> : <ProductImage src={p.img} alt={p.name} style={{ height: '100%', minHeight: 200 }} />}
        <div className="card-pad stack gap12" style={{ justifyContent: 'space-between' }}>
          <div className="row between wrap" style={{ alignItems: 'flex-start' }}>
            <div>
              <div className="pcard-brand">{p.brand}</div>
              <h2 style={{ fontSize: 28, marginTop: 4 }}>
                {p.name} <span className="mono muted" style={{ fontSize: 16, fontWeight: 500 }}>#{p.id}</span>
              </h2>
              <div className="mt8">
                <LifeScore score={Math.min(4, lastReal)} />
              </div>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <div style={{ width: 64, height: 64, border: '1px solid var(--line)', borderRadius: 8, display: 'grid', placeItems: 'center' }}>
                <QrCode size={40} strokeWidth={1.4} />
              </div>
            </div>
          </div>
          <div className="grid g3" style={{ gap: 12 }}>
            <div>
              <div className="small muted">Total value generated</div>
              <div style={{ fontSize: 30, fontWeight: 850, letterSpacing: '-0.03em', color: 'var(--accent-ink)' }}>
                <CountUp from={0} value={total} />
              </div>
            </div>
            <div>
              <div className="small muted">Realised so far</div>
              <div style={{ fontSize: 30, fontWeight: 850, letterSpacing: '-0.03em' }}>{sgd(realized)}</div>
            </div>
            <div>
              <div className="small muted">Economic lives</div>
              <div style={{ fontSize: 30, fontWeight: 850, letterSpacing: '-0.03em' }}>{p.lives.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="passport-timeline">
        {p.lives.map((l, i) => (
          <Fragment key={`${l.n}-${l.label}`}>
            {i > 0 && <div className="life-connector" />}
            <div className={`life-card fade-in ${l.potential ? 'potential' : ''} ${!l.potential && l.n === lastReal ? 'latest' : ''}`} style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="life-no">
                LIFE
                <b>{String(l.n).padStart(2, '0')}</b>
              </div>
              <div>
                <div className="strong" style={{ fontSize: 16 }}>
                  {l.label} {l.potential && <span className="badge badge-outline" style={{ marginLeft: 6 }}>Potential</span>}
                </div>
                <div className="small muted">{l.detail}</div>
                <div className="tiny faint mono mt8">{l.date}</div>
              </div>
              <div className="right">
                <div style={{ fontSize: 24, fontWeight: 850, letterSpacing: '-0.03em', color: l.potential ? 'var(--muted)' : 'var(--ink)' }}>{sgd(l.value)}</div>
                <div className="tiny muted">{l.potential ? 'projected' : 'value at this life'}</div>
              </div>
            </div>
          </Fragment>
        ))}
      </div>

      <div className="row between wrap mt24" style={{ gap: 12 }}>
        <SimTag>
          <Fingerprint size={11} /> Passport records are simulated for the prototype
        </SimTag>
        <Link to="/dashboard" className="link small row" style={{ gap: 4 }}>
          Back to portfolio <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  )
}

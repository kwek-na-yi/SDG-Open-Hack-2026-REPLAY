import { Link } from 'react-router-dom'
import { Check, Minus, Sparkles } from 'lucide-react'
import { PageHead } from '../components/common/ui'
import { sgd } from '../lib/format'
import { PlusBadge, PricingTable } from '../components/studio/StudioPanels'
import { DELIVERY_NOTE, PLUS_PRICE, PLUS_TAGLINE } from '../lib/studio'
import { useStore } from '../store/store'

const FEATURES: [string, boolean][] = [
  ['Basic AI transformation ideas', true],
  ['ALTER and UPCYCLE workflows', true],
  ['AI-generated measurements from your body profile', true],
  ['Manual measurement adjustment', true],
  ['AI feasibility check', true],
  ['Maker-ready specifications', true],
  ['Trend-aware AI', false],
  ['Personalised recommendations', false],
  ['Multiple transformation concepts', false],
  ['2D transformation preview', false],
  ['3D transformation preview', false],
  ['Real-time visual customisation', false],
  ['Saved designs', false],
  ['Transformation history', false],
]

export default function Plus() {
  const { state, user, activatePlus, endPlus } = useStore()
  const on = !!state.plus
  return (
    <div className="container page">
      <PageHead eyebrow="RE:PLAY+" title={PLUS_TAGLINE} subtitle="Your personal AI fashion designer. Free tells you whether a garment can be transformed, and how. RE:PLAY+ shows you the best transformation for you, what it will look like, and lets you customise it before you commit." />

      <div className="plus-grid">
        <div className="card card-dark card-pad stack gap16">
          <div className="row between wrap" style={{ gap: 8 }}>
            <PlusBadge />
            {on && <span className="badge badge-accent">Active · demo</span>}
          </div>
          <div>
            <div className="row" style={{ alignItems: 'baseline', gap: 6 }}>
              <span className="big-value" style={{ fontSize: 48 }}>
                {sgd(PLUS_PRICE, 2)}
              </span>
              <span style={{ color: '#C3B0E2' }}>/month</span>
            </div>
            <div className="strong mt8">{PLUS_TAGLINE}</div>
          </div>
          <ul className="plus-points">
            {['Trend-aware, personalised concepts', 'Several distinct designs per garment', '2D flat sketch + 3D on-body preview', 'Live preview as you adjust measurements', 'Saved designs & transformation history'].map((t) => (
              <li key={t}>
                <Check size={13} /> {t}
              </li>
            ))}
          </ul>
          {on ? (
            <div className="stack gap8">
              <Link className="btn btn-accent btn-lg" to="/dashboard">
                <Sparkles size={15} /> Transform an item
              </Link>
              <button className="btn btn-dark-outline" onClick={endPlus}>
                End demo — back to Free
              </button>
            </div>
          ) : (
            <button className="btn btn-accent btn-lg" onClick={activatePlus}>
              <Sparkles size={15} /> Try RE:PLAY+ demo
            </button>
          )}
          <p className="tiny" style={{ color: '#C3B0E2' }}>
            Prototype: the demo unlocks every RE:PLAY+ feature instantly. No payment is taken and no card is needed.{!user && ' Sign in to keep your demo and saved designs on your account.'}
          </p>
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="table compare-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th className="c">Free</th>
                <th className="c">RE:PLAY+</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map(([f, free]) => (
                <tr key={f}>
                  <td>{f}</td>
                  <td className="c">{free ? <Check size={15} className="accent" /> : <Minus size={15} className="faint" />}</td>
                  <td className="c">
                    <Check size={15} className="accent" />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Price</td>
                <td className="c">Free</td>
                <td className="c">{sgd(PLUS_PRICE, 2)}/mo</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="grid g2 mt24 stack-md">
        <div className="card card-pad">
          <div className="eyebrow">Free answers</div>
          <h3 className="mt8" style={{ fontSize: 20 }}>“Can this garment be transformed, and how?”</h3>
          <p className="small muted mt8">Choose ALTER or UPCYCLE, get AI ideas and measurements, check feasibility and send a maker-ready spec — the full transformation, free.</p>
        </div>
        <div className="card card-pad">
          <div className="eyebrow">RE:PLAY+ answers</div>
          <h3 className="mt8" style={{ fontSize: 20 }}>“What’s the best transformation for me, what will it look like, and can I customise it first?”</h3>
          <p className="small muted mt8">Concepts chosen for your style and fit, a 2D and 3D preview that changes as you adjust it, and every design saved for later.</p>
        </div>
      </div>

      <div className="card mt24">
        <div className="card-head">
          <div>
            <div className="card-title">Transformation pricing</div>
            <div className="card-sub">Shown before you commit to anything.</div>
          </div>
        </div>
        <div className="card-body">
          <PricingTable />
          <p className="tiny muted price-note">{DELIVERY_NOTE}</p>
        </div>
      </div>
    </div>
  )
}

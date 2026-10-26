import { Component, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Check, ClipboardCopy, Info, Lock, Recycle, Ruler, Scissors, Sparkles, Truck, UserRound, X } from 'lucide-react'
import { draftOf, validateFit, type FitDraft, type FitProfile } from '../../lib/fit'
import { ALTER_FEE, PLUS_PRICE, VERDICT_LABEL, alterFee, type BodyChoice, type Feasibility, type GarmentKind, type MakerSpec, type Maker, type TargetForm, type Verdict } from '../../lib/studio'
import { DELIVERY_FEE, DELIVERY_LABEL } from '../../lib/orders'
import { useStore } from '../../store/store'
import FitFields, { FitSummary, type FitErrors } from '../fit/FitFields'
import Garment3D from './Garment3D'
import GarmentFlat, { type FlatDims } from './GarmentFlat'
import { ProductMock, type MockSpec } from '../product/ProductMock'
import { sgd } from '../../lib/format'

/* ---------------- RE:PLAY+ badge & locked state ---------------- */

export function PlusBadge({ label = 'RE:PLAY+' }: { label?: string }) {
  return (
    <span className="badge badge-gold">
      <Sparkles size={11} /> {label}
    </span>
  )
}

/** A premium feature shown — but locked — on the free plan, with a one-click demo unlock. */
export function PlusLock({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  const { activatePlus } = useStore()
  return (
    <div className="plus-lock">
      {children && <div className="plus-lock-peek">{children}</div>}
      <div className="plus-lock-body">
        <div className="row wrap" style={{ gap: 8 }}>
          <span className="plus-lock-ic">
            <Lock size={14} />
          </span>
          <PlusBadge />
        </div>
        <div className="strong mt8">{title}</div>
        <p className="small muted">{text}</p>
        <div className="row wrap mt12" style={{ gap: 8 }}>
          <button type="button" className="btn btn-primary" onClick={activatePlus}>
            <Sparkles size={14} /> Unlock with RE:PLAY+ — {sgd(PLUS_PRICE, 2)}/month
          </button>
          <Link className="btn btn-ghost" to="/plus">
            Compare plans
          </Link>
        </div>
        <p className="tiny muted mt8">Prototype: unlocking starts a free demo — no payment is taken.</p>
      </div>
    </div>
  )
}

/* ---------------- Error boundary ---------------- */

/** Keeps a preview failure inside its frame instead of breaking the page. */
class SafeBoundary extends Component<{ children: ReactNode; label: string }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    /* shown to the user as a friendly message below */
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="fit-empty">
        <AlertTriangle size={18} />
        <div className="strong">We couldn’t draw the {this.props.label}</div>
        <div className="small muted">Check the measurements, then try again.</div>
        <button className="btn btn-outline btn-sm mt8" onClick={() => this.setState({ failed: false })}>
          Try again
        </button>
      </div>
    )
  }
}

/* ---------------- 2D + 3D preview ---------------- */

export interface PreviewProps {
  form: TargetForm | GarmentKind
  dims: FlatDims
  base?: FlatDims
  spec: MockSpec
  title: string
  body: FitProfile
  bodyLabel: string
  placket?: boolean
}

export function PreviewPanel(props: PreviewProps & { note?: string }) {
  const { state } = useStore()
  const { form, dims, base, spec, title, body, bodyLabel, placket, note } = props
  const head = (
    <div className="row between wrap" style={{ gap: 8 }}>
      <div>
        <div className="eyebrow">
          <span className="dot" /> RE:PLAY+ Preview
        </div>
        <div className="small muted mt8">{state.plus ? 'Updates live as you change the measurements.' : 'See it before you pay the maker.'}</div>
      </div>
      <PlusBadge label="2D + 3D" />
    </div>
  )
  if (!state.plus) {
    return (
      <div className="card card-pad stack gap12">
        {head}
        <PlusLock title="2D & 3D Transformation Preview" text={`Preview your ${title.toLowerCase()} as a flat sketch and in 3D on a model built from your measurements — and watch it change as you adjust the fit, before committing.`}>
          <ProductMock {...spec} title={title} style={{ width: '100%', height: '100%' }} />
        </PlusLock>
      </div>
    )
  }
  return (
    <div className="card card-pad stack gap12">
      {head}
      <div className="preview-grid">
        <div className="preview-tile">
          <div className="preview-tile-h">
            <span>2D flat sketch</span>
            <span className="tiny muted">to scale, cm</span>
          </div>
          <div className="preview-flat">
            <SafeBoundary label="2D preview">
              <GarmentFlat form={form} dims={dims} base={base} spec={spec} title={title} />
            </SafeBoundary>
          </div>
        </div>
        <div className="preview-tile">
          <div className="preview-tile-h">
            <span>3D on body</span>
            <span className="tiny muted ellipsis">{bodyLabel}</span>
          </div>
          <SafeBoundary label="3D preview">
            <Garment3D body={body} form={form} dims={dims} spec={spec} placket={placket} title={title} />
          </SafeBoundary>
        </div>
      </div>
      <p className="fit-disclaimer">
        <Info size={12} /> {note ?? 'Illustrative preview built from the measurements entered — a stylised model, not photorealistic and not a guarantee of fit.'}
      </p>
    </div>
  )
}

/* ---------------- Feasibility ---------------- */

const VERDICT_ICON: Record<Verdict, ReactNode> = { ok: <Check size={13} />, caution: <AlertTriangle size={13} />, no: <X size={13} /> }

export function FeasibilityCard({ result, checking, empty }: { result: Feasibility | null; checking?: boolean; empty?: string }) {
  return (
    <div className={`feas ${result && !checking ? `feas-${result.verdict}` : ''}`}>
      <div className="row between wrap" style={{ gap: 8 }}>
        <div className="why-h">
          <Sparkles size={11} /> AI feasibility estimate
        </div>
        {result && !checking && <span className={`badge feas-badge-${result.verdict}`}>{VERDICT_ICON[result.verdict]} {VERDICT_LABEL[result.verdict]}</span>}
      </div>
      {checking ? (
        <div className="small muted mt8 row" style={{ gap: 8 }}>
          <span className="feas-spinner" /> Checking against the original garment…
        </div>
      ) : !result ? (
        <div className="small muted mt8">{empty ?? 'Add your changes to run the check.'}</div>
      ) : (
        <>
          <div className="strong mt8">
            {result.verdict === 'ok' ? '✓ ' : result.verdict === 'caution' ? '⚠ ' : '✕ '}
            {result.headline}
          </div>
          <ul className="feas-notes">
            {result.notes.map((n, i) => (
              <li key={i} className={`feas-note-${n.verdict}`}>
                {n.text}
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="tiny muted mt8">An automated estimate, not a professional tailoring assessment. Your maker confirms before starting.</div>
    </div>
  )
}

/* ---------------- Pricing ---------------- */

/** ALTER fee breakdown: S$6 × areas, always shown apart from item price and delivery. */
export function AlterPrice({ areas }: { areas: number }) {
  return (
    <div className="ledger">
      <div className="ledger-row">
        <span>Alteration areas</span>
        <b>{areas}</b>
      </div>
      <div className="ledger-row">
        <span>Price per area</span>
        <b>{sgd(ALTER_FEE)}</b>
      </div>
      <div className="ledger-row total">
        <span>Alteration fee{areas ? ` — ${areas} area${areas > 1 ? 's' : ''} × ${sgd(ALTER_FEE)}` : ''}</span>
        <b>{sgd(alterFee(areas))}</b>
      </div>
    </div>
  )
}

/** Every RE:PLAY charge at a glance — ALTER tiers, upcycle making costs, RE:PLAY+ and delivery. */
export function PricingTable({ highlight }: { highlight?: number }) {
  return (
    <div className="price-list">
      <div className="price-item">
        <span className="price-ic">
          <Scissors size={15} />
        </span>
        <div className="price-main">
          <div className="price-name">ALTER</div>
          <div className="tiny muted">Make it fit — charged per area changed</div>
        </div>
        <div className="price-val">
          {sgd(ALTER_FEE)}
          <span>/area</span>
        </div>
        <div className="price-tiers">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`price-tier ${highlight === n ? 'on' : ''}`}>
              <span className="tiny muted">
                {n} area{n > 1 ? 's' : ''}
              </span>
              <b>{sgd(alterFee(n))}</b>
            </div>
          ))}
        </div>
      </div>
      <div className="price-item">
        <span className="price-ic">
          <Recycle size={15} />
        </span>
        <div className="price-main">
          <div className="price-name">UPCYCLE</div>
          <div className="tiny muted">Making cost depends on the idea — shown on each one</div>
        </div>
        <div className="price-val price-val-soft">Per idea</div>
      </div>
      <div className="price-item">
        <span className="price-ic price-ic-gold">
          <Sparkles size={15} />
        </span>
        <div className="price-main">
          <div className="price-name">
            RE:PLAY+ <span className="badge badge-outline price-opt">Optional</span>
          </div>
          <div className="tiny muted">Personalised concepts, 2D & 3D previews, saved designs</div>
        </div>
        <div className="price-val">
          {sgd(PLUS_PRICE, 2)}
          <span>/month</span>
        </div>
      </div>
      <div className="price-item">
        <span className="price-ic">
          <Truck size={15} />
        </span>
        <div className="price-main">
          <div className="price-name">{DELIVERY_LABEL}</div>
          <div className="tiny muted">Once per order, however many items</div>
        </div>
        <div className="price-val">
          {sgd(DELIVERY_FEE, 2)}
          <span>/order</span>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Maker-ready specification ---------------- */

function specText(spec: MakerSpec) {
  const lines = [
    `RE:PLAY maker specification — ${spec.type}`,
    `Original item: ${spec.item} (${spec.garment}, ${spec.material}, size ${spec.size})`,
    `Transformation type: ${spec.type}`,
    ...(spec.concept ? [`Selected design: ${spec.concept}`] : []),
    ...(spec.requested?.length ? ['Requested changes:', ...spec.requested.map((r) => `  ${r}`)] : []),
    ...(spec.areas ? [`Areas: ${spec.areas}`] : []),
    ...(spec.fee !== undefined ? [`Alteration fee: S$${spec.fee}`] : []),
    'Measurements:',
    ...spec.measurements.map((m) => `  ${m.label}: ${m.value}`),
    ...(spec.body ? [`Wearer: ${spec.body}`] : []),
    `AI feasibility: ${spec.feasibility.label}`,
    ...spec.feasibility.notes.map((n) => `  ! ${n}`),
    'Required modifications:',
    ...spec.modifications.map((m) => `  - ${m}`),
    `User notes: ${spec.notes.trim() || '—'}`,
    ...(spec.maker ? [`Maker: ${spec.maker}`] : []),
  ]
  return lines.join('\n')
}

export function MakerSpecSheet({ spec, maker }: { spec: MakerSpec; maker?: Maker }) {
  const { toast } = useStore()
  const row = (k: string, v: ReactNode) => (
    <div className="spec-row">
      <div className="spec-k">{k}</div>
      <div className="spec-v">{v}</div>
    </div>
  )
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(specText(spec))
      toast({ title: 'Spec copied', body: 'Paste it anywhere — it’s plain text.', tone: 'success' })
    } catch {
      toast({ title: 'Couldn’t copy', body: 'Your browser blocked the clipboard — select the text instead.', tone: 'error' })
    }
  }
  return (
    <div className="spec">
      <div className="spec-head">
        <div>
          <div className="eyebrow">
            <Ruler size={11} /> Maker-ready specification
          </div>
          <div className="small muted mt8">This becomes the maker’s instruction sheet.</div>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={copy}>
          <ClipboardCopy size={13} /> Copy
        </button>
      </div>
      {row('Original item', `${spec.item} · ${spec.material} · size ${spec.size}`)}
      {row('Transformation type', <span className="badge badge-dark">{spec.type}</span>)}
      {spec.concept && row('Selected design', <b>{spec.concept}</b>)}
      {spec.requested?.length ? row('Requested changes', <div className="stack gap4">{spec.requested.map((r) => <b key={r}>{r}</b>)}</div>) : null}
      {spec.areas && row('Areas', spec.areas)}
      {spec.fee !== undefined && row('Alteration fee', <b>{sgd(spec.fee)}</b>)}
      {row(
        'Measurements',
        <div className="stack gap4">
          {spec.measurements.map((m) => (
            <span key={m.label}>
              {m.label}: <b>{m.value}</b>
            </span>
          ))}
        </div>,
      )}
      {spec.body && row('Wearer', <span className="small">{spec.body}</span>)}
      {row(
        'AI feasibility',
        <div className="stack gap4">
          <span className={`badge feas-badge-${spec.feasibility.verdict}`} style={{ alignSelf: 'flex-start' }}>
            {VERDICT_ICON[spec.feasibility.verdict]} {spec.feasibility.label}
          </span>
          {spec.feasibility.notes.map((n) => (
            <span key={n} className="small muted">
              {n}
            </span>
          ))}
        </div>,
      )}
      {row(
        'Required modifications',
        <ul className="spec-list">
          {spec.modifications.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>,
      )}
      {row('User notes', spec.notes.trim() ? spec.notes : <span className="muted">—</span>)}
      {maker && row('Matched maker', <span>{maker.name} · {maker.focus} · {maker.rating}★ · {maker.area} <span className="tiny muted">(simulated match)</span></span>)}
    </div>
  )
}

/* ---------------- Whose measurements ---------------- */

/** "Use my saved measurements" or "Use different measurements" — temporary ones never overwrite the profile unless asked. */
export function BodySource({ value, onChange }: { value: BodyChoice; onChange: (c: BodyChoice) => void }) {
  const { state, setFitProfile, toast } = useStore()
  const saved = state.fitProfile
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<FitDraft>(() => draftOf(value.body ?? saved))
  const [errors, setErrors] = useState<FitErrors>({})
  const [save, setSave] = useState(false)

  const apply = () => {
    const res = validateFit(draft)
    setErrors(res.errors)
    if (!res.profile) return
    if (save) {
      setFitProfile(res.profile)
      toast({ title: 'Saved as your profile', body: 'Future previews will use these measurements.', tone: 'success' })
    }
    onChange({ body: res.profile, source: save ? 'saved' : 'temporary' })
    setEditing(false)
    setSave(false)
  }

  if (editing) {
    return (
      <form
        className="body-src stack gap12"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          apply()
        }}
      >
        <div className="row between wrap" style={{ gap: 8 }}>
          <div className="strong">Use different measurements</div>
          <button type="button" className="link-btn row" style={{ gap: 4 }} onClick={() => setEditing(false)}>
            <ArrowLeft size={12} /> Cancel
          </button>
        </div>
        <p className="tiny muted">Transforming it for someone else? These are used for this design only.</p>
        <FitFields idPrefix="studio-fit" draft={draft} errors={errors} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} clearError={(k) => setErrors((x) => ({ ...x, [k]: undefined }))} />
        <label className="check">
          <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
          <span>Save as my profile{saved ? ' (replaces your saved measurements)' : ''}</span>
        </label>
        <button type="submit" className="btn btn-accent">
          <Check size={14} /> Use these measurements
        </button>
      </form>
    )
  }

  return (
    <div className="body-src stack gap8">
      <div className="row between wrap" style={{ gap: 8 }}>
        <div className="strong row" style={{ gap: 6 }}>
          <UserRound size={14} /> {value.source === 'saved' ? 'Using my saved measurements' : value.source === 'temporary' ? 'Using different measurements' : 'No measurements yet'}
        </div>
        <span className={`badge ${value.source === 'saved' ? 'badge-accent' : value.source === 'temporary' ? 'badge-gold' : ''}`}>{value.source === 'temporary' ? 'Temporary · not saved' : value.source === 'saved' ? 'Saved profile' : 'Sample model'}</span>
      </div>
      {value.body ? <FitSummary profile={value.body} /> : <p className="small muted">Add measurements so the AI can size the design for the wearer. Until then a sample model is used.</p>}
      <div className="row wrap" style={{ gap: 8 }}>
        {saved && value.source !== 'saved' && (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange({ body: saved, source: 'saved' })}>
            Use my saved measurements
          </button>
        )}
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => {
            setDraft(draftOf(value.body ?? saved))
            setErrors({})
            setEditing(true)
          }}
        >
          {saved || value.body ? 'Use different measurements' : 'Enter measurements'}
        </button>
      </div>
    </div>
  )
}

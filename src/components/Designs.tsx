import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import type { Design, DesignStatus } from '../lib/studio'
import { useStore } from '../lib/store'
import { ProductMock } from './ProductMock'
import { MakerSpecSheet, PlusBadge, PlusLock } from './Studio'
import { Modal, ProductImage, sgd } from './ui'

const STATUS_CLASS: Record<DesignStatus, string> = { Draft: '', 'Ready for Maker': 'badge-outline', 'In Progress': 'badge-gold', Completed: 'badge-accent' }
const date = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Thumb({ d }: { d: Design }) {
  if (d.kind === 'upcycle' && d.idea) return <ProductMock {...d.idea.mock} title={d.title} className="listing-thumb" />
  return <ProductImage src={d.itemImg} alt={d.itemName} className="listing-thumb" />
}

/** One saved design or history entry. */
function Row({ d, onView, history }: { d: Design; onView: () => void; history?: boolean }) {
  const { state, deleteDesign } = useStore()
  const item = state.portfolio.find((i) => i.id === d.itemId)
  const editable = d.status === 'Draft' && item?.status === 'owned' && !state.transformations[item.id]
  const summary = d.spec.requested?.length ? d.spec.requested.join(' · ') : d.spec.measurements.slice(0, 3).map((m) => `${m.label} ${m.value}`).join(' · ')
  return (
    <div className="listing-row">
      <Thumb d={d} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row wrap" style={{ gap: 6 }}>
          <span className="badge badge-dark">{d.kind === 'alter' ? 'ALTER' : 'UPCYCLE'}</span>
          <span className={`badge ${STATUS_CLASS[d.status]}`}>{d.status}</span>
        </div>
        <div className="strong ellipsis mt8">{d.title}</div>
        <div className="small muted ellipsis">
          From {d.itemName} · {summary}
        </div>
        <div className="tiny muted">
          {history ? `${d.status === 'Completed' ? 'Completed' : 'Updated'} ${date(d.updatedAt)}` : `Saved ${date(d.updatedAt)}`} · {d.kind === 'alter' ? `Fee ${sgd(d.price)}` : `Making ${sgd(d.price)}${d.value ? ` · value ~${sgd(d.value)}` : ''}`}
          {history && d.status === 'Completed' && d.kind === 'upcycle' && ` · became a ${d.title.toLowerCase()}`}
        </div>
      </div>
      <div className="listing-actions">
        <button className="btn btn-ghost btn-sm" onClick={onView}>
          <Eye size={13} /> Spec
        </button>
        {d.status === 'Draft' &&
          (editable ? (
            <Link className="btn btn-ghost btn-sm" to={`/transform/${d.itemId}?mode=${d.kind}&design=${d.id}`}>
              <Pencil size={13} /> Continue editing
            </Link>
          ) : (
            <span className="tiny muted" title="The original item has moved on — this design is read-only.">
              Read-only
            </span>
          ))}
        {d.status === 'Draft' && (
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteDesign(d.id)} aria-label={`Delete ${d.title}`}>
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

function SpecModal({ d, onClose }: { d: Design | null; onClose: () => void }) {
  return (
    <Modal open={!!d} onClose={onClose} title={d ? `${d.title} — specification` : ''} size="lg">
      {d && <MakerSpecSheet spec={d.spec} />}
    </Modal>
  )
}

export function SavedDesignsSection() {
  const { state } = useStore()
  const [view, setView] = useState<Design | null>(null)
  const drafts = state.designs.filter((d) => d.status === 'Draft')
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title row" style={{ gap: 8 }}>
            Saved Designs <PlusBadge />
          </div>
          <div className="card-sub">Designs you saved in the Transform studio — open one to keep editing.</div>
        </div>
        <Link to="/dashboard" className="btn btn-outline btn-sm">
          Transform an item
        </Link>
      </div>
      {!state.plus ? (
        <div className="card-body">
          <PlusLock title="Save and reopen designs" text={drafts.length ? `You have ${drafts.length} saved design${drafts.length > 1 ? 's' : ''} kept for you. RE:PLAY+ lets you reopen and keep editing them.` : 'Save any ALTER or UPCYCLE design with its measurements, previews and spec, then pick it up later.'} />
        </div>
      ) : drafts.length === 0 ? (
        <div className="empty">No saved designs yet. In the Transform studio, choose a design and press Save Design.</div>
      ) : (
        drafts.map((d) => <Row key={d.id} d={d} onView={() => setView(d)} />)
      )}
      <SpecModal d={view} onClose={() => setView(null)} />
    </div>
  )
}

export function HistorySection() {
  const { state } = useStore()
  const [view, setView] = useState<Design | null>(null)
  const all = [...state.designs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const done = all.filter((d) => d.status === 'Completed').length
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title row" style={{ gap: 8 }}>
            Transformation History <PlusBadge />
          </div>
          <div className="card-sub">Your circular-fashion journey — every design, alteration and upcycle.</div>
        </div>
        {state.plus && all.length > 0 && (
          <span className="small muted">
            {all.length} record{all.length > 1 ? 's' : ''} · {done} completed
          </span>
        )}
      </div>
      {!state.plus ? (
        <div className="card-body">
          <PlusLock title="Transformation History" text={all.length ? `${all.length} transformation record${all.length > 1 ? 's are' : ' is'} kept for you. RE:PLAY+ shows the full history — originals, specs, status and results.` : 'Keep a record of every garment you alter or upcycle: the original, the spec, its status and the result.'} />
        </div>
      ) : all.length === 0 ? (
        <div className="empty">Nothing yet. Alter or upcycle an item and it will appear here.</div>
      ) : (
        all.map((d) => <Row key={d.id} d={d} history onView={() => setView(d)} />)
      )}
      <SpecModal d={view} onClose={() => setView(null)} />
    </div>
  )
}

import { useEffect, useState, type ReactNode } from 'react'
import { Check, X } from 'lucide-react'
import { BUDGETS, DIFFICULTIES, EMPTY_FILTERS, PREFERENCES, PRODUCT_TYPES, PROFITS, STYLES, activeFilterCount, type Filters, type OptionCounts } from '../../lib/ideas'

function Chip({ on, children, onClick, count }: { on: boolean; children: ReactNode; onClick: () => void; count?: number }) {
  const none = count === 0 && !on
  return (
    <button type="button" className={`chip ${on ? 'on' : ''}`} onClick={onClick} aria-pressed={on} disabled={none} title={none ? 'No ideas of this kind for this garment' : undefined}>
      {on && <Check size={12} />}
      {children}
      {count !== undefined && <span className="chip-count">{count}</span>}
    </button>
  )
}

/** Slide-in drawer for filtering transformation ideas; edits a draft and applies it on confirm. */
export default function FilterPanel({ open, value, counts, garment, onApply, onClose }: { open: boolean; value: Filters; counts: OptionCounts; garment: string; onApply: (f: Filters) => void; onClose: () => void }) {
  const [f, setF] = useState<Filters>(value)
  useEffect(() => {
    if (open) setF(value)
  }, [open, value])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  const toggle = (k: 'types' | 'styles' | 'difficulties', v: string) =>
    setF((x) => {
      const list = x[k] as string[]
      return { ...x, [k]: list.includes(v) ? list.filter((y) => y !== v) : [...list, v] }
    })

  return (
    <div className="drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Filter transformations">
        <div className="drawer-head">
          <div>
            <div className="eyebrow">Find your style</div>
            <h3 style={{ fontSize: 20, marginTop: 4 }}>Filter transformations</h3>
            <div className="small muted mt8">Numbers show how many ideas your {garment} can become in each option.</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close filters">
            <X size={16} />
          </button>
        </div>
        <div className="drawer-body">
          <section>
            <h4>Product type</h4>
            <div className="chips">
              {PRODUCT_TYPES.map((t) => (
                <Chip key={t} on={f.types.includes(t)} count={counts.types[t]} onClick={() => toggle('types', t)}>
                  {t}
                </Chip>
              ))}
            </div>
          </section>
          <section>
            <h4>Style</h4>
            <div className="chips">
              {STYLES.map((t) => (
                <Chip key={t} on={f.styles.includes(t)} count={counts.styles[t]} onClick={() => toggle('styles', t)}>
                  {t}
                </Chip>
              ))}
            </div>
          </section>
          <section>
            <h4>Difficulty</h4>
            <div className="chips">
              {DIFFICULTIES.map((t) => (
                <Chip key={t} on={f.difficulties.includes(t)} count={counts.difficulties[t]} onClick={() => toggle('difficulties', t)}>
                  {t}
                </Chip>
              ))}
            </div>
          </section>
          <section>
            <h4>Budget · transformation cost</h4>
            <div className="chips">
              {BUDGETS.map((b) => (
                <Chip key={b.id} on={f.budget === b.id} count={counts.budget[b.id]} onClick={() => setF((x) => ({ ...x, budget: b.id }))}>
                  {b.label}
                </Chip>
              ))}
            </div>
          </section>
          <section>
            <h4>Profit potential</h4>
            <div className="chips">
              {PROFITS.map((v) => (
                <Chip key={v} on={f.minProfit === v} count={counts.minProfit[v]} onClick={() => setF((x) => ({ ...x, minProfit: v }))}>
                  {v === 0 ? 'Any' : `S$${v}+`}
                </Chip>
              ))}
            </div>
          </section>
          <section>
            <h4>Personal preference</h4>
            <div className="stack gap8">
              {PREFERENCES.map((pr) => (
                <button key={pr.id} type="button" className={`pref ${f.preference === pr.id ? 'on' : ''}`} onClick={() => setF((x) => ({ ...x, preference: x.preference === pr.id ? null : pr.id }))}>
                  <span className="radio" />
                  {pr.label}
                </button>
              ))}
            </div>
          </section>
        </div>
        <div className="drawer-foot">
          <button className="btn btn-outline btn-lg" onClick={() => setF(EMPTY_FILTERS)}>
            Clear all
          </button>
          <button className="btn btn-accent btn-lg" style={{ flex: 1 }} onClick={() => onApply(f)}>
            Apply filters{activeFilterCount(f) > 0 ? ` (${activeFilterCount(f)})` : ''}
          </button>
        </div>
      </aside>
    </div>
  )
}

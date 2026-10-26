import { useEffect, useMemo, useState } from 'react'
import { Check, Minus, Plus, Save, Scissors } from 'lucide-react'
import type { PortfolioItem } from '../lib/data'
import { garmentMock, type GarmentProfile } from '../lib/ideas'
import {
  ALTER_FEE,
  DELIVERY_NOTE,
  KIND_OF,
  alterAreas,
  alterFeasibility,
  alterFee,
  alterIdea,
  alterSpec,
  alteredMeasures,
  amountError,
  changeLabel,
  garmentMeasures,
  makerFor,
  measuresNote,
  type AlterChange,
  type AreaId,
  type Design,
  type Direction,
} from '../lib/studio'
import { useStore, type DesignDraft } from '../lib/store'
import { AlterPrice, BodySource, FeasibilityCard, MakerSpecSheet, PlusBadge, PreviewPanel, bodyLabelOf, initialBody, previewBody, type BodyChoice } from './Studio'
import { sgd } from './ui'

interface Row {
  dir: Direction
  raw: string
}

function Step({ n, title, sub, children, right }: { n: number; title: string; sub?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="card card-pad stack gap12">
      <div className="row between wrap" style={{ gap: 8, alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
          <span className="step-n mono">{n}</span>
          <div>
            <div className="strong" style={{ fontSize: 15 }}>
              {title}
            </div>
            {sub && <div className="small muted">{sub}</div>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

export default function AlterStudio({ item, p, initial, onStarted }: { item: PortfolioItem; p: GarmentProfile; initial?: Design | null; onStarted: () => void }) {
  const { state, startAlteration, saveDesign } = useStore()
  const areas = useMemo(() => alterAreas(p), [p])
  const m = useMemo(() => garmentMeasures(p), [p])
  const kind = KIND_OF[p.category]
  const mock = useMemo(() => garmentMock(p), [p])
  const maker = makerFor('alter', p)

  const [dir, setDir] = useState<Direction>(initial?.alter?.[0]?.dir ?? 'decrease')
  const [selected, setSelected] = useState<AreaId[]>(() => initial?.alter?.map((c) => c.area).filter((a) => areas.some((x) => x.id === a)) ?? [])
  const [rows, setRows] = useState<Partial<Record<AreaId, Row>>>(() => Object.fromEntries((initial?.alter ?? []).map((c) => [c.area, { dir: c.dir, raw: String(c.amount) }])))
  const [body, setBody] = useState<BodyChoice>(() => (initial?.body ? { body: initial.body, source: JSON.stringify(initial.body) === JSON.stringify(state.fitProfile) ? 'saved' : 'temporary' } : initialBody(state.fitProfile)))
  const [notes, setNotes] = useState(initial?.spec.notes ?? '')
  const [designId, setDesignId] = useState<string | undefined>(initial?.status === 'Draft' ? initial.id : undefined)
  const [checking, setChecking] = useState(false)

  const toggle = (id: AreaId) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
    setRows((r) => (r[id] ? r : { ...r, [id]: { dir, raw: '' } }))
  }
  const setAllDir = (d: Direction) => {
    setDir(d)
    setRows((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { ...v!, dir: d }])))
  }

  const errors = Object.fromEntries(selected.map((id) => [id, amountError(rows[id]?.raw ?? '', id, rows[id]?.dir ?? dir, m)])) as Record<AreaId, string | null>
  const changes: AlterChange[] = selected.filter((id) => !errors[id]).map((id) => ({ area: id, dir: rows[id]?.dir ?? dir, amount: Math.round(Number(rows[id]!.raw) * 10) / 10 }))
  const complete = selected.length > 0 && changes.length === selected.length
  const after = alteredMeasures(m, changes)
  const feas = complete ? alterFeasibility(p, m, changes, body.body) : null
  const fee = alterFee(selected.length)
  const spec = complete && feas ? { ...alterSpec(p, item.name, m, changes, feas, notes, body.body, bodyLabelOf(body)), maker: maker.name } : null
  const key = JSON.stringify([changes, body.body])

  // A short "checking" beat whenever the request changes, so updates are noticeable.
  useEffect(() => {
    if (!complete) return
    setChecking(true)
    const t = setTimeout(() => setChecking(false), 450)
    return () => clearTimeout(t)
  }, [key, complete])

  const draft = (): DesignDraft | null =>
    spec && {
      id: designId,
      itemId: item.id,
      itemName: item.name,
      itemImg: item.img,
      kind: 'alter',
      title: `Fit alteration — ${spec.areas}`,
      spec,
      alter: changes,
      body: body.body,
      price: fee,
      preview: { form: kind, shape: mock.shape, colour: mock.colour },
    }

  const blocked = !complete ? 'Choose at least one area and enter valid amounts.' : feas?.verdict === 'no' ? 'The feasibility check advises against this request — adjust the amounts to continue.' : null

  return (
    <section className="mt24 alter-grid fade-in">
      <div className="stack gap16" style={{ minWidth: 0 }}>
        <Step n={1} title="Choose what you want to change" sub="Pick a direction, then every area you want altered.">
          <div className="seg" role="radiogroup" aria-label="Direction">
            {(['decrease', 'increase'] as Direction[]).map((d) => (
              <button key={d} type="button" role="radio" aria-checked={dir === d} className={`seg-btn ${dir === d ? 'on' : ''}`} onClick={() => setAllDir(d)}>
                {d === 'decrease' ? <Minus size={13} /> : <Plus size={13} />} {d === 'decrease' ? 'Decrease' : 'Increase'}
              </button>
            ))}
          </div>
          <div className="area-grid">
            {areas.map((a) => {
              const on = selected.includes(a.id)
              return (
                <button key={a.id} type="button" className={`area ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle(a.id)}>
                  <span className="area-box">{on && <Check size={12} />}</span>
                  <span>
                    <span className="strong">{a.label}</span>
                    <span className="tiny muted" style={{ display: 'block' }}>
                      {a.hint} · now ~{m[a.id]} cm
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </Step>

        <Step n={2} title="Specify the amount" sub={measuresNote(p)}>
          {!selected.length ? (
            <div className="small muted">Select an area above to enter how much to change it.</div>
          ) : (
            <div className="stack gap8">
              {selected.map((id) => {
                const a = areas.find((x) => x.id === id)!
                const r = rows[id] ?? { dir, raw: '' }
                const err = errors[id]
                return (
                  <div key={id} className={`amount-row field ${err && r.raw ? 'has-error' : ''}`}>
                    <label htmlFor={`amt-${id}`} className="strong">
                      {a.label}
                    </label>
                    <div className="seg seg-sm" role="radiogroup" aria-label={`${a.short} direction`}>
                      {(['decrease', 'increase'] as Direction[]).map((d) => (
                        <button key={d} type="button" role="radio" aria-checked={r.dir === d} className={`seg-btn ${r.dir === d ? 'on' : ''}`} onClick={() => setRows((x) => ({ ...x, [id]: { ...r, dir: d } }))}>
                          {d === 'decrease' ? 'Decrease by' : 'Increase by'}
                        </button>
                      ))}
                    </div>
                    <div className="input-suffix">
                      <input id={`amt-${id}`} className="input" type="number" inputMode="decimal" min={0} step="0.5" placeholder="e.g. 3" value={r.raw} aria-invalid={!!err && !!r.raw} onChange={(e) => setRows((x) => ({ ...x, [id]: { ...r, raw: e.target.value } }))} />
                      <span>cm</span>
                    </div>
                    <div className="amount-now small">
                      {err ? (
                        r.raw ? <span className="field-error">{err}</span> : <span className="muted">~{m[id]} cm now</span>
                      ) : (
                        <>
                          <span className="muted">{m[id]} cm →</span> <b>{after[id]} cm</b>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
              {changes.length > 0 && (
                <div className="row wrap" style={{ gap: 6 }}>
                  {changes.map((c) => (
                    <span key={c.area} className="badge badge-dark change-chip">
                      {changeLabel(c)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </Step>

        <PreviewPanel
          form={kind}
          dims={after}
          base={m}
          spec={mock}
          title={item.name}
          body={previewBody(body)}
          bodyLabel={bodyLabelOf(body)}
          placket={p.category === 'shirt' || p.category === 'jacket'}
          note="Altered garment in colour; the original outline is dashed. A stylised preview — not photorealistic and not a guarantee of fit."
        />

        <Step n={3} title="AI feasibility check" sub="Checked against the original garment and the wearer’s measurements.">
          <BodySource value={body} onChange={setBody} />
          <FeasibilityCard result={feas} checking={checking} empty="Choose an area and enter an amount to run the check." />
        </Step>

        <Step n={4} title="Alteration price" sub={`${sgd(ALTER_FEE)} per alteration area.`}>
          <AlterPrice areas={selected.length} />
          <p className="tiny muted">{DELIVERY_NOTE}</p>
        </Step>

        <div className="card card-pad stack gap12">
          <div className="field">
            <label htmlFor="alter-notes">
              Notes for the maker <span className="muted">optional</span>
            </label>
            <textarea id="alter-notes" className="input" maxLength={400} placeholder="e.g. Keep the original hem stitching visible." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {spec ? <MakerSpecSheet spec={spec} maker={maker} /> : <div className="small muted">Your maker-ready specification appears here once your changes are complete.</div>}
        </div>
      </div>

      <aside className="alter-side">
        <div className="card card-pad stack gap12">
          <div className="row" style={{ gap: 10 }}>
            <span className="fit-cta-ic">
              <Scissors size={15} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="eyebrow">Alter</div>
              <div className="strong ellipsis">{item.name}</div>
            </div>
          </div>
          <div className="stack gap4">
            {changes.length ? (
              changes.map((c) => (
                <div key={c.area} className="row between small">
                  <span>{changeLabel(c)}</span>
                  <span className="muted">{sgd(ALTER_FEE)}</span>
                </div>
              ))
            ) : (
              <div className="small muted">No changes yet.</div>
            )}
          </div>
          <div className="row between" style={{ borderTop: '1px solid var(--line-2)', paddingTop: 10 }}>
            <span className="strong">Alteration fee</span>
            <span style={{ fontSize: 22, fontWeight: 800 }}>{sgd(fee)}</span>
          </div>
          <div className="tiny muted">
            {selected.length} area{selected.length === 1 ? '' : 's'} × {sgd(ALTER_FEE)} · paid from RE:PLAY Cash · separate from the item price and delivery
          </div>
          {feas && !checking && <span className={`badge feas-badge-${feas.verdict}`} style={{ alignSelf: 'flex-start' }}>AI feasibility: {feas.verdict === 'ok' ? 'Likely feasible' : feas.verdict === 'caution' ? 'Feasible with limits' : 'Not recommended'}</span>}
          <button
            className="btn btn-accent btn-lg btn-block"
            disabled={!!blocked}
            title={blocked ?? undefined}
            onClick={() => {
              const d = draft()
              if (!d || !spec) return
              if (startAlteration(item.id, alterIdea(p, changes, mock, maker, item.current), d)) onStarted()
            }}
          >
            <Scissors size={15} /> Confirm & send to maker · {sgd(fee)}
          </button>
          {blocked && <div className="tiny muted">{blocked}</div>}
          <button
            className="btn btn-outline btn-block"
            disabled={!spec}
            onClick={() => {
              const d = draft()
              if (!d) return
              const id = saveDesign(d)
              if (id) setDesignId(id)
            }}
          >
            <Save size={14} /> Save Design {!state.plus && <PlusBadge />}
          </button>
          <div className="tiny muted">Matched maker: {maker.name} — {maker.focus} (simulated).</div>
        </div>
      </aside>
    </section>
  )
}

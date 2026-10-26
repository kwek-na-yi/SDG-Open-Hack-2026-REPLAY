import { useEffect, useMemo, useState } from 'react'
import { Check, Flame, RotateCcw, Save, Sparkles, TrendingUp } from 'lucide-react'
import type { PortfolioItem } from '../lib/data'
import { STYLES, type Difficulty, type GarmentProfile, type Idea, type Style } from '../lib/ideas'
import {
  FIT_PREFS,
  FORM_OF,
  SAMPLE_BODY,
  TRENDS,
  TREND_SOURCE,
  VERDICT_LABEL,
  defaultStyleProfile,
  fieldError,
  makerFor,
  plusConcepts,
  upcycleFeasibility,
  upcycleFields,
  upcycleSpec,
  type Design,
  type FitPref,
  type SpecField,
  type StyleProfile,
} from '../lib/studio'
import { useStore, type DesignDraft } from '../lib/store'
import type { FlatDims } from './GarmentFlat'
import { ProductMock } from './ProductMock'
import { BodySource, FeasibilityCard, MakerSpecSheet, PlusBadge, PlusLock, PreviewPanel, bodyLabelOf, initialBody, previewBody, type BodyChoice } from './Studio'
import { sgd } from './ui'

const DIFF_CLASS: Record<Difficulty, string> = { Easy: 'easy', Medium: 'medium', Advanced: 'advanced' }

/* ------------------------------------------------------------------ */
/* RE:PLAY+ — personalised, trend-aware concepts                       */
/* ------------------------------------------------------------------ */

export function PlusConcepts({ p, onPick }: { p: GarmentProfile; onPick: (idea: Idea) => void }) {
  const { state, setStyleProfile } = useStore()
  const style: StyleProfile = state.styleProfile ?? defaultStyleProfile(p)
  const [thinking, setThinking] = useState(false)
  const history = useMemo(() => state.designs.filter((d) => d.kind === 'upcycle' && d.idea).map((d) => ({ ideaId: d.idea!.id, type: d.idea!.type, styles: d.idea!.styles })), [state.designs])
  const concepts = useMemo(() => (state.plus ? plusConcepts(p, style, history, state.fitProfile ?? SAMPLE_BODY) : []), [p, style, history, state.fitProfile, state.plus])

  const update = (next: StyleProfile) => {
    setThinking(true)
    setStyleProfile(next)
    setTimeout(() => setThinking(false), 700)
  }

  if (!state.plus) {
    return (
      <section className="mt24">
        <PlusLock title="Your personal AI fashion designer" text={`Get several distinct concepts for this ${p.garment}, chosen for your style and fit and informed by current trends — then preview each one in 2D and 3D. The 3 free ideas below are always yours.`} />
      </section>
    )
  }

  return (
    <section className="mt24 card card-pad stack gap16 plus-concepts">
      <div className="row between wrap" style={{ gap: 12, alignItems: 'flex-end' }}>
        <div>
          <div className="row wrap" style={{ gap: 8 }}>
            <PlusBadge />
            <span className="eyebrow">Designed for you</span>
          </div>
          <h2 style={{ fontSize: 22, marginTop: 8 }}>{concepts.length} concepts for your {p.garment}</h2>
          <div className="small muted mt8">Personalised to your style and fit, informed by trend signals, limited to what this garment can really become.</div>
        </div>
      </div>

      <div className="style-editor">
        <div className="stack gap8" style={{ minWidth: 0 }}>
          <div className="tiny muted strong">YOUR STYLE · pick up to 3</div>
          <div className="chips">
            {STYLES.map((s) => {
              const on = style.styles.includes(s)
              return (
                <button
                  key={s}
                  type="button"
                  className={`chip ${on ? 'on' : ''}`}
                  aria-pressed={on}
                  onClick={() => {
                    const styles: Style[] = on ? style.styles.filter((x) => x !== s) : [...style.styles, s].slice(-3)
                    if (styles.length) update({ ...style, styles })
                  }}
                >
                  {on && <Check size={12} />} {s}
                </button>
              )
            })}
          </div>
        </div>
        <div className="stack gap8">
          <div className="tiny muted strong">PREFERRED FIT</div>
          <div className="seg">
            {FIT_PREFS.map((f) => (
              <button key={f.id} type="button" className={`seg-btn ${style.fit === f.id ? 'on' : ''}`} onClick={() => update({ ...style, fit: f.id })}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="trend-strip">
        <span className="tiny muted strong row" style={{ gap: 4 }}>
          <TrendingUp size={12} /> TRENDING NOW
        </span>
        {TRENDS.slice(0, 5).map((t) => (
          <span key={t.id} className="badge badge-outline">
            <Flame size={10} /> {t.label} · {t.heat}
          </span>
        ))}
        <span className="tiny faint">{TREND_SOURCE}</span>
      </div>

      <div className="ideas-wrap">
        <div className={`grid concept-grid ${thinking ? 'ideas-grid dim' : ''}`} key={JSON.stringify(style)}>
          {concepts.map((c, k) => (
            <div key={c.idea.id} className="card idea-card concept-card reveal-in" style={{ animationDelay: `${k * 0.08}s` }}>
              <div className="idea-visual">
                <ProductMock {...c.idea.mock} title={c.idea.title} style={{ position: 'absolute', inset: 0 }} />
                <span className="idea-no mono">C{k + 1}</span>
                <span className="badge idea-type">{c.idea.type}</span>
                {c.trend && (
                  <span className="badge badge-gold idea-flag">
                    <Flame size={10} /> Trending
                  </span>
                )}
              </div>
              <div className="card-pad stack gap8" style={{ flex: 1 }}>
                <div className="tiny muted mono">Concept {k + 1}</div>
                <h3 style={{ fontSize: 17 }}>{c.idea.title}</h3>
                <div className="small muted">{c.description}</div>
                <div className="why">
                  <div className="why-h">
                    <Sparkles size={11} /> For you
                  </div>
                  <p>{c.pitch}</p>
                </div>
                <div>
                  <div className="tiny muted strong">KEY MODIFICATIONS</div>
                  <ul className="spec-list small">
                    {c.mods.slice(0, 3).map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
                <div className="row wrap" style={{ gap: 6, marginTop: 'auto' }}>
                  <span className={`diff ${DIFF_CLASS[c.idea.difficulty]}`}>
                    <i /> {c.idea.difficulty}
                  </span>
                  <span className={`badge feas-badge-${c.feasibility.verdict}`}>{VERDICT_LABEL[c.feasibility.verdict]}</span>
                  <span className="tiny muted">
                    ~{sgd(c.idea.sale)} value · {sgd(c.idea.cost)} to make
                  </span>
                </div>
                <button className="btn btn-primary btn-block" onClick={() => onPick(c.idea)}>
                  Select concept
                </button>
              </div>
            </div>
          ))}
        </div>
        {thinking && (
          <div className="thinking fade-in">
            <div className="thinking-orb">
              <Sparkles size={18} />
            </div>
            <div className="strong">Re-designing for your style…</div>
          </div>
        )}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Specification: measurements, preview, feasibility, maker spec       */
/* ------------------------------------------------------------------ */

export interface UpcycleReady {
  draft: DesignDraft | null
  blocked: string | null
}

export function UpcycleSpec({
  item,
  p,
  idea,
  initial,
  onReady,
  onStart,
}: {
  item: PortfolioItem
  p: GarmentProfile
  idea: Idea
  initial?: Design | null
  onReady: (r: UpcycleReady) => void
  onStart: (draft: DesignDraft) => void
}) {
  const { state, saveDesign } = useStore()
  const [fit, setFit] = useState<FitPref>(initial?.fit ?? state.styleProfile?.fit ?? defaultStyleProfile(p).fit)
  const [body, setBody] = useState<BodyChoice>(() => (initial?.body ? { body: initial.body, source: JSON.stringify(initial.body) === JSON.stringify(state.fitProfile) ? 'saved' : 'temporary' } : initialBody(state.fitProfile)))
  const ai = useMemo(() => upcycleFields(idea, previewBody(body), fit), [idea, body, fit])
  const [raw, setRaw] = useState<Record<string, string>>(() => Object.fromEntries((initial?.idea?.id === idea.id && initial.fields ? initial.fields : ai).map((f) => [f.key, String(f.value)])))
  const [notes, setNotes] = useState(initial?.spec.notes ?? '')
  const [designId, setDesignId] = useState<string | undefined>(initial?.status === 'Draft' ? initial.id : undefined)
  const [checking, setChecking] = useState(false)
  const [first, setFirst] = useState(true)

  // New AI measurements whenever the wearer or preferred fit changes (not on first load of a saved design).
  useEffect(() => {
    if (first) {
      setFirst(false)
      return
    }
    setRaw(Object.fromEntries(ai.map((f) => [f.key, String(f.value)])))
  }, [ai]) // eslint-disable-line react-hooks/exhaustive-deps

  const errors = Object.fromEntries(ai.map((f) => [f.key, fieldError(raw[f.key] ?? '', f)])) as Record<string, string | null>
  const valid = ai.every((f) => !errors[f.key])
  const fields: SpecField[] = ai.map((f) => ({ ...f, value: errors[f.key] ? f.value : Math.round(Number(raw[f.key]) * 2) / 2 }))
  const edited = ai.some((f) => String(f.value) !== (raw[f.key] ?? '').trim())
  const feas = valid ? upcycleFeasibility(p, idea, fields, body.body) : null
  const maker = makerFor('upcycle', p, idea)
  const spec = feas ? upcycleSpec(p, item.name, idea, fields, feas, notes, body.body, bodyLabelOf(body), fit) : null
  const form = FORM_OF[idea.mock.shape]
  const wearable = form !== 'bag' && form !== 'item'
  const dims: FlatDims = Object.fromEntries(fields.map((f) => [f.key === 'brim' ? 'width' : f.key, f.value]))
  const key = JSON.stringify([fields, body.body])

  useEffect(() => {
    setChecking(true)
    const t = setTimeout(() => setChecking(false), 450)
    return () => clearTimeout(t)
  }, [key])

  const draft: DesignDraft | null = spec && {
    id: designId,
    itemId: item.id,
    itemName: item.name,
    itemImg: item.img,
    kind: 'upcycle',
    title: idea.title,
    spec,
    idea,
    fields,
    fit,
    body: body.body,
    price: idea.cost,
    value: idea.sale,
    preview: { form, shape: idea.mock.shape, colour: idea.mock.colour },
  }
  const blocked = !valid ? 'Fix the highlighted measurements first.' : feas?.verdict === 'no' ? 'The feasibility check advises against these measurements — adjust them to continue.' : null
  // The spec's timestamp changes every render — leave it out, or reporting up would loop.
  const readyKey = JSON.stringify([draft && { ...draft, spec: { ...draft.spec, generatedAt: '' } }, blocked])
  useEffect(() => {
    onReady({ draft, blocked })
  }, [readyKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="mt16 upcycle-spec fade-in" id="upcycle-spec">
      <div className="upcycle-grid">
        <div className="card card-pad stack gap16" style={{ minWidth: 0 }}>
          <div>
            <div className="eyebrow">
              <span className="dot" /> Adjust specifications
            </div>
            <h3 style={{ fontSize: 19, marginTop: 6 }}>Measurements for your {idea.title.toLowerCase()}</h3>
            <div className="small muted mt8">{wearable ? 'AI-generated from the wearer’s measurements and preferred fit. Change any value.' : 'Standard sizes for this piece. Change any value.'}</div>
          </div>

          {wearable && <BodySource value={body} onChange={setBody} />}

          {wearable && (
            <div className="stack gap8">
              <div className="tiny muted strong">FIT</div>
              <div className="seg">
                {FIT_PREFS.map((f) => (
                  <button key={f.id} type="button" className={`seg-btn ${fit === f.id ? 'on' : ''}`} onClick={() => setFit(f.id)}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {ai.length ? (
            <div className="spec-fields">
              {ai.map((f) => (
                <div key={f.key} className={`field ${errors[f.key] ? 'has-error' : ''}`}>
                  <label htmlFor={`up-${f.key}`}>
                    {f.label} <span className="muted">cm</span>
                  </label>
                  <div className="input-suffix">
                    <input id={`up-${f.key}`} className="input" type="number" inputMode="decimal" step="0.5" value={raw[f.key] ?? ''} aria-invalid={!!errors[f.key]} onChange={(e) => setRaw((r) => ({ ...r, [f.key]: e.target.value }))} />
                    <span>cm</span>
                  </div>
                  {errors[f.key] ? <span className="field-error">{errors[f.key]}</span> : <span className="tiny muted">AI suggests {f.value} cm</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="small muted">One-size piece — no measurements needed.</div>
          )}
          {edited && (
            <button type="button" className="link-btn row" style={{ gap: 4, alignSelf: 'flex-start' }} onClick={() => setRaw(Object.fromEntries(ai.map((f) => [f.key, String(f.value)])))}>
              <RotateCcw size={12} /> Reset to AI suggestion
            </button>
          )}
          <FeasibilityCard result={feas} checking={checking} empty="Enter valid measurements to run the check." />
          <div className="field">
            <label htmlFor="up-notes">
              Notes for the maker <span className="muted">optional</span>
            </label>
            <textarea id="up-notes" className="input" maxLength={400} placeholder="e.g. Keep the original buttons." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <PreviewPanel form={form} dims={dims} spec={idea.mock} title={idea.title} body={previewBody(body)} bodyLabel={bodyLabelOf(body)} placket={form === 'outer' || form === 'vest' || idea.id === 'shirtdress'} />
      </div>

      <div className="card card-pad stack gap16 mt16">
        {spec ? <MakerSpecSheet spec={spec} maker={maker} /> : <div className="small muted">Your maker-ready specification appears once the measurements are valid.</div>}
        <div className="row wrap" style={{ gap: 10 }}>
          <button className="btn btn-accent btn-lg" disabled={!!blocked || !draft} title={blocked ?? undefined} onClick={() => draft && onStart(draft)}>
            <Sparkles size={16} /> Confirm & send to maker · {sgd(idea.cost)}
          </button>
          <button
            className="btn btn-outline btn-lg"
            disabled={!draft}
            onClick={() => {
              if (!draft) return
              const id = saveDesign(draft)
              if (id) setDesignId(id)
            }}
          >
            <Save size={15} /> Save Design {!state.plus && <PlusBadge />}
          </button>
          {blocked && <span className="small muted">{blocked}</span>}
        </div>
      </div>
    </section>
  )
}

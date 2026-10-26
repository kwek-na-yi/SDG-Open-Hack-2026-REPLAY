import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowRight, Check, Fingerprint, History, Recycle, RotateCw, Scissors, Shirt, SlidersHorizontal, Sparkles, Tag, User } from 'lucide-react'
import { CountUp, ItemVisual, Modal, SimTag } from '../components/common/ui'
import { sgd } from '../lib/format'
import FitPreview from '../components/fit/FitPreview'
import { ProductMock } from '../components/product/ProductMock'
import AlterStudio from '../components/studio/AlterStudio'
import { MakerSpecSheet, PlusBadge, PricingTable } from '../components/studio/StudioPanels'
import { PlusConcepts, UpcycleSpec, type UpcycleReady } from '../components/studio/UpcycleStudio'
import FilterPanel from '../components/transform/FilterPanel'
import IdeaCard from '../components/transform/IdeaCard'
import Journey from '../components/transform/Journey'
import Ledger from '../components/transform/Ledger'
import SourceCard from '../components/transform/SourceCard'
import { DIFF_CLASS, conditionWord, money } from '../components/transform/format'
import { zoneOf } from '../lib/fit'
import { BUDGETS, EMPTY_FILTERS, PREFERENCES, activeFilterCount, optionCounts, profileOf, recommend, type Filters, type Idea } from '../lib/ideas'
import { ALTER_FEE, PLUS_PRICE, canAlter, type Design } from '../lib/studio'
import { useStore } from '../store/store'

const FLOW = ['Second-hand item', 'Maker', 'Transformation', 'New product', 'New customer']
const ALTER_FLOW = ['Spec sent', 'Maker matched', 'Altering', 'Quality check', 'Back to you']
type Mode = 'alter' | 'upcycle'

export default function Transform() {
  const { itemId } = useParams()
  const nav = useNavigate()
  const { state, startTransformation, completeTransformation, completeAlteration, setDesignStatus, sellTransformed, keepItem, toast } = useStore()
  const item = state.portfolio.find((i) => i.id === itemId)
  const active = itemId ? state.transformations[itemId] : undefined
  const isAlter = active?.kind === 'alter'
  const [params, setParams] = useSearchParams()
  const designParam = params.get('design')
  // A saved design reopened from Account → Saved Designs / History.
  const resume: Design | null = useMemo(() => (designParam ? state.designs.find((d) => d.id === designParam && d.itemId === itemId) ?? null : null), [designParam]) // eslint-disable-line react-hooks/exhaustive-deps
  const modeParam = params.get('mode')
  const mode: Mode | null = modeParam === 'alter' || modeParam === 'upcycle' ? modeParam : resume?.kind ?? null
  const setMode = (m: Mode | null) => setParams(m ? { mode: m } : {})
  const [ready, setReady] = useState<UpcycleReady>({ draft: null, blocked: null })
  const [doneAlter, setDoneAlter] = useState<Design | null>(null)
  const [pricingOpen, setPricingOpen] = useState(false)
  const warned = useRef(false)
  // A completed alteration belongs to the item it was made on.
  useEffect(() => setDoneAlter(null), [itemId])
  // Always analyse the garment as it was before its transformation.
  const p = useMemo(() => (item ? profileOf({ ...item, name: item.name.replace(/ \(from .*\)$/, '') }) : null), [item?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [round, setRound] = useState(0)
  const [thinking, setThinking] = useState(false)
  const [analysing, setAnalysing] = useState(item?.status === 'owned')
  const [filterOpen, setFilterOpen] = useState(false)
  const [picked, setPicked] = useState<Idea | null>(resume?.kind === 'upcycle' && item?.status === 'owned' ? resume.idea ?? null : null)
  const [fitOpen, setFitOpen] = useState(false)
  const [step, setStep] = useState(item?.status === 'sold' && active ? 5 : item?.status === 'transformed' ? 4 : 0)

  const set = useMemo(() => (p ? recommend(p, filters, round) : null), [p, filters, round])
  const counts = useMemo(() => (p ? optionCounts(p) : null), [p])

  useEffect(() => {
    if (!analysing) return
    const t = setTimeout(() => setAnalysing(false), 1600)
    return () => clearTimeout(t)
  }, [analysing])

  // The maker works through the pipeline while the item is transforming.
  useEffect(() => {
    if (item?.status !== 'transforming') return
    setStep(0)
    const timers = [1, 2, 3, 4].map((s) => setTimeout(() => setStep(s), 1000 * s))
    timers.push(setTimeout(() => setDesignStatus(active?.designId, 'In Progress'), 1000 + 50))
    timers.push(
      setTimeout(() => {
        if (active?.kind === 'alter') {
          setDoneAlter(completeAlteration(item.id))
          setParams({})
        } else completeTransformation(item.id)
      }, 1000 * 4 + 50),
    )
    return () => timers.forEach(clearTimeout)
  }, [item?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // A design link that no longer matches anything (deleted, or another item's) — say so, don't break.
  useEffect(() => {
    if (!designParam || resume || warned.current) return
    warned.current = true
    toast({ title: 'Couldn’t load that design', body: 'It may have been deleted. Starting a fresh transformation instead.', tone: 'error' })
    setParams(modeParam ? { mode: modeParam } : {}, { replace: true })
  }, [designParam, resume]) // eslint-disable-line react-hooks/exhaustive-deps

  const think = (update: () => void) => {
    setThinking(true)
    setTimeout(() => {
      update()
      setThinking(false)
    }, 1100)
  }

  if (!item || !p || !set) {
    return (
      <div className="container page empty">
        Item not found. <Link className="link" to="/dashboard">Back to your portfolio</Link>
      </div>
    )
  }

  if (item.status !== 'owned' && !active) {
    return (
      <div className="container page empty">
        This item has already moved on to its next life. <Link className="link" to={`/passport/${item.passportId}`}>View its Life Passport</Link>
      </div>
    )
  }

  const idea = active?.idea ?? picked
  // Only attach the spec that belongs to the idea on screen.
  const readyDraft = ready.draft && ready.draft.idea?.id === idea?.id ? ready.draft : undefined
  const phase: 'choose' | 'confirm' | 'progress' | 'complete' | 'sold' =
    item.status === 'transforming' ? 'progress' : item.status === 'transformed' ? 'complete' : item.status === 'sold' ? 'sold' : picked ? 'confirm' : 'choose'
  const journeyStep = analysing ? 0 : phase === 'choose' ? (thinking ? 1 : 2) : phase === 'confirm' ? 3 : 4
  const nFilters = activeFilterCount(filters)
  const flowValues = idea ? [sgd(p.acquisition, p.shippingIn ? 2 : undefined), idea.maker, `${idea.days}-day rework`, sgd(idea.sale), phase === 'sold' ? 'Sold' : 'Matched buyer'] : []

  return (
    <div className="container page">
      <div className="row between wrap" style={{ marginBottom: 14 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => nav(-1)}>
          <ArrowLeft size={14} /> Back
        </button>
        <SimTag>AI Transformation Studio · prototype simulation</SimTag>
      </div>

      <div className="transform-hero">
        {isAlter || (phase === 'choose' && mode === 'alter') ? (
          <div>
            <div className="eyebrow">
              <Scissors size={12} /> Alter
            </div>
            <h1 className="title mt8" style={{ fontSize: 30 }}>
              Make it fit me. <span className="muted">Tell us what to change — AI checks it, prices it at {sgd(ALTER_FEE)} per area and writes the maker’s instructions.</span>
            </h1>
          </div>
        ) : phase === 'choose' && !mode ? (
          <div>
            <div className="eyebrow">
              <span className="dot" /> Transform
            </div>
            <h1 className="title mt8" style={{ fontSize: 30 }}>
              Buy it. Transform it. RE:PLAY it. <span className="muted">Make your {p.garment} fit you, or give it a new life.</span>
            </h1>
          </div>
        ) : (
          <>
            <div>
              <div className="eyebrow">
                <span className="dot" /> Give it a new life
              </div>
              <h1 className="title mt8" style={{ fontSize: 30 }}>
                Give AI a second-hand garment. <span className="muted">It gives you three ways to turn it into something worth more.</span>
              </h1>
            </div>
            <Journey step={journeyStep} />
          </>
        )}
        {phase === 'choose' && mode && (
          <div>
            <button className="btn btn-outline btn-sm" onClick={() => setMode(null)}>
              <ArrowLeft size={13} /> Alter or upcycle
            </button>
          </div>
        )}
      </div>

      <SourceCard item={item} p={p} analysing={analysing} />

      {phase === 'choose' && doneAlter && (
        <section className="card card-dark card-pad mt24 fade-in">
          <div className="eyebrow" style={{ color: '#A68BC9' }}>
            <Scissors size={12} /> Alteration complete
          </div>
          <h2 style={{ fontSize: 30, marginTop: 8 }}>Altered to fit.</h2>
          <div className="row wrap mt12" style={{ gap: 6 }}>
            {(doneAlter.spec.requested ?? []).map((r) => (
              <span key={r} className="badge badge-accent">
                {r}
              </span>
            ))}
          </div>
          <div className="small mt12" style={{ color: '#C3B0E2' }}>
            {item.name} is back in your collection — same garment, better fit. {doneAlter.spec.maker} worked from your maker-ready spec, and the change is recorded in its Life Passport.
          </div>
          <div className="row wrap mt24" style={{ gap: 10 }}>
            <Link className="btn btn-light" to="/dashboard">
              Back to dashboard
            </Link>
            <Link className="btn btn-dark-outline" to={`/passport/${item.passportId}`}>
              <Fingerprint size={14} /> Life Passport
            </Link>
            <Link className="btn btn-dark-outline" to="/account?tab=history">
              <History size={14} /> Transformation history
            </Link>
            <button className="btn btn-dark-outline" onClick={() => setDoneAlter(null)}>
              Transform again
            </button>
          </div>
        </section>
      )}

      {phase === 'choose' && !mode && !doneAlter && (
        <section className="mt24 fade-in">
          <div className="mode-head">
            <h2 style={{ fontSize: 24 }}>What do you want to do?</h2>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setPricingOpen(true)}>
              <Tag size={14} /> Pricing
            </button>
          </div>
          <div className="grid g2 mode-grid mt12">
            <button type="button" className="card card-hover mode-card" onClick={() => setMode('alter')} disabled={!canAlter(p)}>
              <span className="fit-cta-ic mode-ic">
                <Scissors size={17} />
              </span>
              <span className="mode-k mono">ALTER</span>
              <span className="mode-t">Make it fit me.</span>
              <span className="small muted">Modify the fit, proportions or measurements of the existing garment without substantially redesigning it.</span>
              <span className="mode-points small">
                <span>
                  <Check size={12} /> Pick areas — length, waist, sleeves, chest, hips
                </span>
                <span>
                  <Check size={12} /> AI feasibility check
                </span>
                <span>
                  <Check size={12} /> Maker-ready instructions
                </span>
              </span>
              <span className="row between wrap mode-foot" style={{ gap: 8 }}>
                <span className="strong">{sgd(ALTER_FEE)} per alteration area</span>
                {canAlter(p) ? (
                  <span className="btn btn-primary btn-sm">
                    Alter it <ArrowRight size={13} />
                  </span>
                ) : (
                  <span className="tiny muted">Alterations are for clothing — upcycle this {p.garment} instead.</span>
                )}
              </span>
            </button>
            <button type="button" className="card card-hover mode-card" onClick={() => setMode('upcycle')}>
              <span className="fit-cta-ic mode-ic">
                <Recycle size={17} />
              </span>
              <span className="mode-k mono">UPCYCLE</span>
              <span className="mode-t">Give it a new life.</span>
              <span className="small muted">Creatively transform your garment into something new.</span>
              <span className="mode-points small">
                <span>
                  <Check size={12} /> AI transformation ideas
                </span>
                <span>
                  <Check size={12} /> Measurements from your body profile
                </span>
                <span>
                  <Check size={12} /> AI feasibility + maker-ready spec
                </span>
              </span>
              <span className="row between wrap mode-foot" style={{ gap: 8 }}>
                <span className="strong">Making cost shown per idea</span>
                <span className="btn btn-primary btn-sm">
                  Upcycle it <ArrowRight size={13} />
                </span>
              </span>
            </button>
          </div>
          <div className="plus-strip mt12">
            <PlusBadge />
            <span className="small">
              <b>Design it. See it. Make it.</b> <span className="muted">Personalised trend-aware concepts, 2D & 3D previews, saved designs and history — {sgd(PLUS_PRICE, 2)}/month.</span>
            </span>
            <Link className="link-btn" to="/plus" style={{ marginLeft: 'auto' }}>
              {state.plus ? 'RE:PLAY+ is on' : 'See RE:PLAY+'}
            </Link>
          </div>
          <Modal open={pricingOpen} onClose={() => setPricingOpen(false)} title="Transformation pricing">
            <PricingTable />
            <p className="tiny muted price-note">Item prices and delivery are charged at checkout. Alteration fees and upcycle making costs are paid when you confirm a transformation. RE:PLAY+ is optional.</p>
          </Modal>
        </section>
      )}

      {phase === 'choose' && mode === 'alter' && !doneAlter && canAlter(p) && <AlterStudio key={`${item.id}-${resume?.id ?? 'new'}`} item={item} p={p} initial={resume?.kind === 'alter' ? resume : null} onStarted={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />}
      {phase === 'choose' && mode === 'alter' && !canAlter(p) && (
        <div className="card card-pad mt24 small">
          Alterations are for clothing. This {p.garment} can still be <button className="link-btn" onClick={() => setMode('upcycle')}>upcycled into something new</button>.
        </div>
      )}

      {phase === 'choose' && mode === 'upcycle' && (
        <PlusConcepts
          p={p}
          onPick={(i) => {
            setPicked(i)
            setTimeout(() => document.getElementById('next-life')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
          }}
        />
      )}

      {phase === 'choose' && mode === 'upcycle' && (
        <section className="mt24">
          <div className="ideas-head">
            <div>
              <div className="eyebrow">
                <span className="dot" /> AI Transformation Ideas
              </div>
              <h2 style={{ fontSize: 24, marginTop: 6 }}>3 things your {p.garment} could become</h2>
            </div>
            <div className="row wrap" style={{ gap: 8 }}>
              <button className={`btn btn-outline btn-lg ${nFilters ? 'filter-on' : ''}`} onClick={() => setFilterOpen(true)} disabled={analysing}>
                <SlidersHorizontal size={15} /> Filter
                {nFilters > 0 && <span className="count-pill">{nFilters}</span>}
              </button>
              <button className="btn btn-accent btn-lg" onClick={() => think(() => setRound((r) => r + 1))} disabled={thinking || analysing}>
                <RotateCw size={16} className={thinking ? 'spin' : ''} /> Refresh ideas
              </button>
            </div>
          </div>

          {nFilters > 0 && (
            <div className="filter-status fade-in">
              <span className="strong">Showing transformations matching your preferences</span>
              <span className="row wrap" style={{ gap: 6 }}>
                {[...filters.types, ...filters.styles, ...filters.difficulties].map((t) => (
                  <span key={t} className="badge">
                    {t}
                  </span>
                ))}
                {filters.budget !== 'any' && <span className="badge">{BUDGETS.find((b) => b.id === filters.budget)?.label}</span>}
                {filters.minProfit > 0 && <span className="badge">S${filters.minProfit}+ profit</span>}
                {filters.preference && <span className="badge">{PREFERENCES.find((x) => x.id === filters.preference)?.label.replace('I want ', '')}</span>}
              </span>
              <span className="small" style={{ color: set.exact >= 3 ? 'var(--accent-ink)' : 'var(--warn)' }}>
                {set.exact >= 3
                  ? `${set.exact} ideas match every filter`
                  : set.exact === 0
                    ? `No idea fits every filter for this ${p.garment} — showing the 3 closest alternatives`
                    : `Only ${set.exact} idea${set.exact > 1 ? 's' : ''} fit${set.exact > 1 ? '' : 's'} every filter — plus ${3 - set.exact} closest alternative${3 - set.exact > 1 ? 's' : ''}`}
              </span>
              <button
                className="link small"
                style={{ background: 'none', border: 0, cursor: 'pointer', marginLeft: 'auto' }}
                onClick={() =>
                  think(() => {
                    setFilters(EMPTY_FILTERS)
                    setRound(0)
                  })
                }
              >
                Clear filters
              </button>
            </div>
          )}

          <div className="ideas-wrap">
            <div className={`grid g3 ideas-grid ${thinking || analysing ? 'dim' : ''}`} key={`${round}-${JSON.stringify(filters)}`}>
              {set.ideas.map((i, k) => (
                <IdeaCard
                  key={i.id}
                  idea={i}
                  index={k}
                  p={p}
                  filtered={nFilters > 0}
                  onSelect={() => {
                    setPicked(i)
                    setTimeout(() => document.getElementById('next-life')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
                  }}
                />
              ))}
            </div>
            {(thinking || analysing) && (
              <div className="thinking fade-in">
                <div className="thinking-orb">
                  <Sparkles size={18} />
                </div>
                <div className="strong">{analysing ? `AI is analysing your second-hand ${p.garment}…` : 'AI is exploring new possibilities…'}</div>
                <div className="small muted">{analysing ? 'Reading fabric, condition and usable surface area' : 'Matching your garment against 30 transformation patterns'}</div>
              </div>
            )}
          </div>
          <div className="row between mt12 small muted wrap">
            <span>
              Idea set {set.round + 1} of {set.rounds} · {nFilters ? `${set.exact} of ${set.total} ideas match your filters` : `${set.total} ideas fit this garment`}
            </span>
            <span>
              Prices are AI estimates for {p.colourName.toLowerCase()} {p.material} in {conditionWord(p.conditionLabel).toLowerCase()} condition.
            </span>
          </div>
        </section>
      )}

      {phase === 'confirm' && idea && (
        <section id="next-life" className="card next-life mt24 fade-in">
          <div className="next-life-visuals">
            <div className="nl-item">
              <ItemVisual item={item} style={{ aspectRatio: '1', borderRadius: 12 }} />
              <div className="tiny muted mt8">Second-hand {p.garment}</div>
              <div className="strong">{sgd(p.acquisition)}</div>
            </div>
            <div className="nl-arrow">
              <ArrowRight size={22} className="h" />
              <ArrowDown size={22} className="v" />
            </div>
            <div className="nl-item">
              <ProductMock {...idea.mock} title={idea.title} style={{ aspectRatio: '1', borderRadius: 12 }} />
              <div className="tiny muted mt8">{idea.title}</div>
              <div className="strong accent">{sgd(idea.sale)}</div>
            </div>
          </div>
          <div className="stack gap16" style={{ minWidth: 0 }}>
            <div>
              <div className="eyebrow">
                <span className="dot" /> Your next life
              </div>
              <div className="small muted mt12">Second-hand {p.garment}</div>
              <ArrowDown size={16} className="accent" style={{ margin: '4px 0' }} />
              <h2 style={{ fontSize: 30 }}>{idea.title}</h2>
              <div className="row wrap mt8" style={{ gap: 8 }}>
                <span className={`diff ${DIFF_CLASS[idea.difficulty]}`}>
                  <i /> {idea.difficulty}
                </span>
                <span className="badge badge-outline">{idea.style}</span>
                <span className="tiny muted row" style={{ gap: 4 }}>
                  <User size={11} /> {idea.maker} · {idea.days} days
                </span>
              </div>
            </div>
            <div className="grid g3" style={{ gap: 10 }}>
              <div className="nl-stat">
                <div className="l">Estimated selling price</div>
                <div className="v">{sgd(idea.sale)}</div>
              </div>
              <div className="nl-stat">
                <div className="l">Estimated transformation cost</div>
                <div className="v">{sgd(idea.cost)}</div>
              </div>
              <div className={`nl-stat profit ${idea.profit < 0 ? 'neg' : ''}`}>
                <div className="l">Potential profit</div>
                <div className="v">{money(idea.profit)}</div>
              </div>
            </div>
            <Ledger p={p} idea={idea} />
            {zoneOf(idea.mock.shape) ? (
              <div className="fit-cta">
                <span className="fit-cta-ic">
                  <Shirt size={16} />
                </span>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div className="strong">Try it on before you decide</div>
                  <div className="small muted">See the {idea.title.toLowerCase()} on a model built from your measurements.</div>
                </div>
                <button className="btn btn-primary" onClick={() => setFitOpen(true)}>
                  <Sparkles size={14} /> Try it on · AI Fit Preview
                </button>
              </div>
            ) : (
              <div className="tiny muted">AI Fit Preview is available for clothing, bags and accessories — this is a homeware piece.</div>
            )}
            <div className="row wrap" style={{ gap: 10 }}>
              <button
                className="btn btn-accent btn-lg"
                disabled={!!ready.blocked}
                title={ready.blocked ?? undefined}
                onClick={() => {
                  if (startTransformation(item.id, idea, readyDraft)) setPicked(null)
                }}
              >
                <Sparkles size={16} /> Start transformation · {sgd(idea.cost)}
              </button>
              <button
                className="btn btn-outline btn-lg"
                onClick={() => {
                  setPicked(null)
                  if (!mode) setMode('upcycle')
                }}
              >
                Choose another idea
              </button>
            </div>
            <button type="button" className="link-btn row" style={{ gap: 4, alignSelf: 'flex-start' }} onClick={() => document.getElementById('upcycle-spec')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              <ArrowDown size={12} /> Measurements, feasibility & maker-ready spec
            </button>
          </div>
        </section>
      )}

      {phase === 'confirm' && idea && (
        <UpcycleSpec
          key={`${item.id}-${idea.id}`}
          item={item}
          p={p}
          idea={idea}
          initial={resume?.kind === 'upcycle' ? resume : null}
          onReady={setReady}
          onStart={(draft) => {
            if (startTransformation(item.id, idea, draft)) {
              setPicked(null)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }
          }}
        />
      )}

      {phase === 'progress' && isAlter && idea && (
        <section className="stack gap16 mt24">
          <div className="card card-pad fade-in">
            <div className="row between wrap" style={{ marginBottom: 14, gap: 8 }}>
              <div className="card-title">Alteration progress — {active?.spec?.requested?.join(' · ') ?? idea.why}</div>
              <span className="badge badge-gold">In progress</span>
            </div>
            <div className="flow">
              {ALTER_FLOW.map((f, i) => (
                <div key={f} className={`flow-step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                  <div className="n">{i < step ? '✓' : `0${i + 1}`}</div>
                  <div className="t">{f}</div>
                  <div className="v">{[active?.spec?.areas ?? 'Fit', idea.maker, `${idea.days}-day job`, 'Checked against spec', 'Delivered to you'][i]}</div>
                </div>
              ))}
            </div>
            <div className="tiny muted mt12">Simulated timeline — {idea.days} working days compressed into seconds for the demo. Fee paid: {sgd(idea.cost)}.</div>
          </div>
          {active?.spec && (
            <div className="card card-pad fade-in">
              <MakerSpecSheet spec={active.spec} />
            </div>
          )}
        </section>
      )}

      {(phase === 'progress' || phase === 'complete' || phase === 'sold') && idea && !isAlter && (
        <section className="stack gap16 mt24">
          <div className="card card-pad fade-in">
            <div className="row between wrap" style={{ marginBottom: 14, gap: 8 }}>
              <div className="card-title">Transformation progress — {idea.title}</div>
              <span className={`badge ${phase === 'progress' ? 'badge-gold' : 'badge-accent'}`}>{phase === 'progress' ? 'In progress' : phase === 'sold' ? 'Complete · sold' : 'Complete'}</span>
            </div>
            <div className="flow">
              {FLOW.map((f, i) => (
                <div key={f} className={`flow-step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                  <div className="n">{i < step ? '✓' : `0${i + 1}`}</div>
                  <div className="t">{f}</div>
                  <div className="v">{flowValues[i]}</div>
                </div>
              ))}
            </div>
            <div className="tiny muted mt12">Simulated timeline — {idea.days} working days compressed into seconds for the demo.</div>
          </div>

          <div className="card card-dark card-pad fade-in">
            <div className="grid stack-md" style={{ gridTemplateColumns: 'minmax(0, 220px) minmax(0, 1fr) minmax(0, 300px)', gap: 24, alignItems: 'center' }}>
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
                {phase === 'progress' ? (
                  <>
                    <ItemVisual item={{ ...item, mock: undefined }} style={{ aspectRatio: '1' }} />
                    <div className="scanline" />
                  </>
                ) : (
                  <ProductMock {...idea.mock} title={idea.title} className="reveal-in" style={{ aspectRatio: '1' }} />
                )}
              </div>
              <div>
                <div className="eyebrow" style={{ color: '#A68BC9' }}>
                  Value created
                </div>
                <div className="row" style={{ gap: 14, marginTop: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#A68BC9' }}>{sgd(p.acquisition)}</span>
                  <ArrowRight size={22} color="#D9C6F7" />
                  <span className="big-value" style={{ fontSize: 60 }}>
                    {phase === 'progress' ? sgd(p.acquisition) : <CountUp from={p.acquisition} value={idea.sale} duration={1200} />}
                  </span>
                </div>
                <div className="small mt8" style={{ color: '#C3B0E2' }}>
                  Second-hand {p.garment} → {idea.title}
                </div>
                {phase === 'complete' && (
                  <div className="row wrap mt24" style={{ gap: 10 }}>
                    <button
                      className="btn btn-accent btn-lg"
                      onClick={() => {
                        sellTransformed(item.id)
                        setStep(5)
                      }}
                    >
                      Sell to matched buyer · {sgd(idea.sale)}
                    </button>
                    <button
                      className="btn btn-dark-outline btn-lg"
                      onClick={() => {
                        keepItem(item.id)
                        nav('/dashboard')
                      }}
                    >
                      Keep it
                    </button>
                  </div>
                )}
                {phase === 'sold' && (
                  <div className="row wrap mt24" style={{ gap: 10 }}>
                    <span className="badge badge-accent" style={{ height: 30, padding: '0 12px' }}>
                      <Check size={13} /> {sgd(idea.sale - idea.shippingOut, 2)} credited after delivery · {money(idea.profit)} profit
                    </span>
                    <Link className="btn btn-light" to={`/passport/${item.passportId}`}>
                      <Fingerprint size={14} /> Open Life Passport
                    </Link>
                    <Link className="btn btn-dark-outline" to="/wallet">
                      Wallet
                    </Link>
                  </div>
                )}
              </div>
              <Ledger p={p} idea={idea} dark />
            </div>
          </div>
        </section>
      )}

      <FitPreview
        open={fitOpen && phase === 'confirm'}
        idea={phase === 'confirm' ? idea : null}
        garment={p.garment}
        onClose={() => setFitOpen(false)}
        onProceed={() => {
          if (ready.blocked) {
            toast({ title: 'Check the specification first', body: ready.blocked, tone: 'info' })
            return
          }
          if (idea && startTransformation(item.id, idea, readyDraft)) {
            setFitOpen(false)
            setPicked(null)
          }
        }}
      />

      <FilterPanel
        open={filterOpen}
        value={filters}
        counts={counts!}
        garment={p.garment}
        onClose={() => setFilterOpen(false)}
        onApply={(f) => {
          setFilterOpen(false)
          think(() => {
            setFilters(f)
            setRound(0)
          })
        }}
      />
    </div>
  )
}

import { Component, useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, ArrowLeft, Check, Info, Ruler, Sparkles, UserRound } from 'lucide-react'
import type { Idea } from '../lib/ideas'
import { MODEL_TYPES, SAMPLE_PROFILES, ZONE_LABEL, draftOf, estimateSize, fitNotes, validateFit, zoneOf, type FitDraft, type FitProfile } from '../lib/fit'
import { useStore } from '../lib/store'
import FitFields, { FitSummary, type FitErrors } from './FitFields'
import FitModel from './FitModel'
import { ProductMock } from './ProductMock'
import { Modal, sgd } from './ui'

const DISCLAIMER = 'AI fit preview is an estimate and does not guarantee actual garment fit.'

/** Keeps a drawing failure inside the preview frame instead of breaking the page. */
class PreviewBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
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
        <div className="strong">We couldn’t generate this preview</div>
        <div className="small muted">Please check your measurements and try again.</div>
        <button
          className="btn btn-outline btn-sm mt8"
          onClick={() => {
            this.setState({ failed: false })
            this.props.onRetry()
          }}
        >
          Try again
        </button>
      </div>
    )
  }
}

const money = (n: number) => (n < 0 ? `−${sgd(Math.abs(n))}` : `+${sgd(n)}`)
const sizeNote = (p: FitProfile) => {
  const est = estimateSize(p)
  return p.size && p.size !== est ? `You wear ${p.size} · measurements suggest ${est}` : `Size ${p.size ?? est}${p.size ? '' : ' (estimated)'}`
}

export default function FitPreview({ open, idea, garment, onClose, onProceed }: { open: boolean; idea: Idea | null; garment: string; onClose: () => void; onProceed: () => void }) {
  const { state, setFitProfile, toast } = useStore()
  const saved = state.fitProfile
  // A: a saved profile is offered first. B: no profile — enter measurements for this preview. C: "Use different measurements".
  const [mode, setMode] = useState<'saved' | 'form'>(saved ? 'saved' : 'form')
  const [draft, setDraft] = useState<FitDraft>(() => draftOf(saved))
  const [errors, setErrors] = useState<FitErrors>({})
  const [profile, setProfile] = useState<FitProfile | null>(null)
  /** Where the shown preview's measurements came from */
  const [source, setSource] = useState<'saved' | 'temporary'>('temporary')
  /** Measurements entered here only replace the saved profile when this is ticked */
  const [saveToProfile, setSaveToProfile] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const previewRef = useRef<HTMLDivElement>(null)

  // Fresh form (pre-filled from the last profile) each time the preview opens.
  useEffect(() => {
    if (!open) return
    setMode(state.fitProfile ? 'saved' : 'form')
    setDraft(draftOf(state.fitProfile))
    setErrors({})
    setProfile(null)
    setSaveToProfile(false)
    setGenerating(false)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!generating) return
    const t = setTimeout(() => setGenerating(false), 1300)
    return () => clearTimeout(t)
  }, [generating])

  const zone = idea ? zoneOf(idea.mock.shape) : null
  const title = idea ? `AI Fit Preview — ${idea.title}` : 'AI Fit Preview'

  const show = (p: FitProfile, from: 'saved' | 'temporary') => {
    setProfile(p)
    setSource(from)
    setGenerating(true)
    setAttempt((a) => a + 1)
    setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80)
  }

  const generate = () => {
    const res = validateFit(draft)
    setErrors(res.errors)
    if (!res.profile) return
    if (saveToProfile) {
      setFitProfile(res.profile)
      toast({ title: 'Saved as your profile', body: 'Future fit previews will use these measurements.', tone: 'success' })
    }
    show(res.profile, saveToProfile ? 'saved' : 'temporary')
  }

  const set = (patch: Partial<FitDraft>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setProfile(null)
  }

  let body: ReactNode
  if (!idea) {
    body = (
      <div className="fit-empty">
        <Info size={18} />
        <div className="strong">Choose a transformation first</div>
        <div className="small muted">Select one of the AI ideas, then open its fit preview.</div>
      </div>
    )
  } else if (!zone) {
    body = (
      <div className="fit-empty">
        <Info size={18} />
        <div className="strong">{idea.title} isn’t worn, so there’s nothing to try on</div>
        <div className="small muted">AI Fit Preview is available for clothing, bags and accessories.</div>
      </div>
    )
  } else {
    body = (
      <div className="fit-grid">
        {mode === 'saved' && saved ? (
          <div className="fit-form">
            <div>
              <div className="eyebrow">
                <span className="dot" /> Use my saved measurements
              </div>
              <p className="small muted mt8">From your RE:PLAY account — no need to enter them again.</p>
            </div>
            <FitSummary profile={saved} />
            <button type="button" className="btn btn-accent btn-lg" disabled={generating} onClick={() => show(saved, 'saved')}>
              <UserRound size={16} /> Use Saved Profile
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setMode('form')
                setProfile(null)
              }}
            >
              Use different measurements
            </button>
            <p className="tiny muted">Buying for someone else? Use different measurements — your saved profile won’t change.</p>
          </div>
        ) : (
          <form
            className="fit-form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              generate()
            }}
          >
            <div>
              {saved && (
                <button
                  type="button"
                  className="link-btn row"
                  style={{ gap: 4, marginBottom: 8 }}
                  onClick={() => {
                    setMode('saved')
                    setErrors({})
                    setProfile(null)
                  }}
                >
                  <ArrowLeft size={12} /> Use my saved measurements
                </button>
              )}
              <div className="eyebrow">
                <span className="dot" /> {saved ? 'Use different measurements' : 'Enter measurements for this preview'}
              </div>
              <p className="small muted mt8">Used for this preview only — handy if you’re buying for someone else.</p>
            </div>

            <FitFields idPrefix="fit" draft={draft} errors={errors} onChange={set} clearError={(k) => setErrors((x) => ({ ...x, [k]: undefined }))} />

            <div className="small muted row wrap" style={{ gap: 6 }}>
              Try a sample:
              {SAMPLE_PROFILES.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setDraft(draftOf(s.profile))
                    setErrors({})
                    setProfile(null)
                  }}
                >
                  {s.label} ({MODEL_TYPES.find((m) => m.id === s.profile.model)?.label.toLowerCase()}, {s.profile.height} cm)
                </button>
              ))}
            </div>

            <label className="check">
              <input type="checkbox" checked={saveToProfile} onChange={(e) => setSaveToProfile(e.target.checked)} />
              <span>Save as my profile{saved ? ' (replaces your saved measurements)' : ''}</span>
            </label>

            <button type="submit" className="btn btn-accent btn-lg" disabled={generating}>
              <Sparkles size={16} /> {profile ? 'Update fit preview' : 'Generate fit preview'}
            </button>
            <p className="tiny muted">Only height and three measurements — no photos. {saveToProfile ? 'They’ll be saved to your account.' : 'Not saved unless you tick “Save as my profile”.'}</p>
          </form>
        )}

        <div className="fit-stage" ref={previewRef}>
          <div className="fit-frame">
            {profile ? (
              <PreviewBoundary key={attempt} onRetry={() => setAttempt((a) => a + 1)}>
                <div className={generating ? 'fit-dim' : 'fit-in'}>
                  <FitModel profile={profile} spec={idea.mock} />
                </div>
              </PreviewBoundary>
            ) : (
              <div className="fit-placeholder">
                <ProductMock {...idea.mock} title={idea.title} className="fit-placeholder-mock" />
                <div className="strong mt12">See the {idea.title.toLowerCase()} on a model</div>
                <div className="small muted">Enter your measurements and generate a preview.</div>
              </div>
            )}
            {profile && !generating && (
              <span className="badge badge-dark fit-label">
                <Sparkles size={11} /> {title}
              </span>
            )}
            {profile && !generating && (
              <div className="fit-inset" title={`Your ${idea.title}`}>
                <ProductMock {...idea.mock} title={idea.title} style={{ position: 'absolute', inset: 0 }} />
              </div>
            )}
            {generating && (
              <div className="thinking fit-thinking fade-in">
                <div className="thinking-orb">
                  <Sparkles size={18} />
                </div>
                <div className="strong">Fitting your {idea.title.toLowerCase()}…</div>
                <div className="small muted">Building a model from your measurements</div>
              </div>
            )}
          </div>

          {profile && !generating && (
            <div className="stack gap12 fade-in">
              <div className="row wrap" style={{ gap: 6 }}>
                <span className="badge">{MODEL_TYPES.find((m) => m.id === profile.model)?.label} model</span>
                <span className="badge">{profile.height} cm</span>
                <span className="badge">
                  {profile.bust} / {profile.waist} / {profile.hips} cm
                </span>
                <span className="badge badge-outline">{sizeNote(profile)}</span>
                <span className={`badge ${source === 'saved' ? 'badge-accent' : 'badge-gold'}`}>
                  {source === 'saved' ? (
                    <>
                      <Check size={11} /> Saved profile
                    </>
                  ) : (
                    'Temporary measurements · not saved'
                  )}
                </span>
              </div>
              <div className="fit-notes">
                <div className="why-h">
                  <Ruler size={11} /> Estimated fit · {ZONE_LABEL[zone]}
                </div>
                <ul>
                  {fitNotes(idea.mock.shape, profile).map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
              <div className="idea-money fit-value">
                <div>
                  <div className="l">Transformed from</div>
                  <div className="v small-v">Second-hand {garment}</div>
                </div>
                <div>
                  <div className="l">Estimated value</div>
                  <div className="v">{sgd(idea.sale)}</div>
                </div>
                <div>
                  <div className="l">Potential profit</div>
                  <div className={`v ${idea.profit < 0 ? 'warn' : 'accent'}`}>{money(idea.profit)}</div>
                </div>
              </div>
            </div>
          )}
          <p className="fit-disclaimer">
            <Info size={12} /> {DISCLAIMER} The model is an illustration based on the measurements you entered, not an exact representation of your body.
          </p>
        </div>
      </div>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      {body}
      <div className="fit-actions">
        <button className="btn btn-outline btn-lg" onClick={onClose}>
          Back
        </button>
        {idea && zone && (
          <button className="btn btn-accent btn-lg" onClick={onProceed}>
            <Sparkles size={16} /> Transform this item · {sgd(idea.cost)}
          </button>
        )}
      </div>
    </Modal>
  )
}

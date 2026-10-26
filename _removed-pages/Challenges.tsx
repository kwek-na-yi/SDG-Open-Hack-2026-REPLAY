import { useEffect, useState } from 'react'
import { Check, RotateCcw, Trophy, Users } from 'lucide-react'
import { PageHead, ProductImage, SimTag, sgd } from '../components/ui'
import { CHALLENGE_ROUTES, IMG, OTHER_CHALLENGES } from '../lib/data'
import { useStore } from '../lib/store'

export default function Challenges() {
  const { state, startChallenge, completeChallenge, resetChallenge } = useStore()
  const c = state.challenge
  const [route, setRoute] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const running = CHALLENGE_ROUTES.find((r) => r.id === route)

  useEffect(() => {
    if (!running) return
    setStep(0)
    const timers = running.steps.map((_, i) => setTimeout(() => setStep(i + 1), 900 * (i + 1)))
    timers.push(setTimeout(() => {
      completeChallenge(running.title, running.potential)
      setRoute(null)
    }, 900 * running.steps.length + 300))
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route])

  return (
    <div className="container page">
      <PageHead
        display
        eyebrow="Profit Challenge · Week 38"
        title="Can you turn S$5 into S$30?"
        subtitle="Circular entrepreneurship, not more consumption: every challenge starts from second-hand clothing that already exists."
        right={<SimTag>Simulated outcomes</SimTag>}
      />

      <div className="grid stack-md" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        <div className="stack gap16">
          <div className="card stack-sm" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', overflow: 'hidden' }}>
            <ProductImage src={IMG.whiteTee} alt="Second-hand T-shirt" style={{ height: '100%', minHeight: 190 }} />
            <div className="card-pad stack gap12">
              <div className="eyebrow">Starting asset</div>
              <h3 style={{ fontSize: 22 }}>Second-hand T-shirt</h3>
              <p className="small muted">A previously loved cotton tee from a RE:PLAY take-back bin. Size M, good condition.</p>
              <div className="row between wrap">
                <div>
                  <div className="small muted">Acquisition cost</div>
                  <div style={{ fontSize: 28, fontWeight: 850 }}>S$5</div>
                </div>
                {c.status === 'idle' && (
                  <button className="btn btn-accent btn-lg" onClick={startChallenge}>
                    Acquire for S$5
                  </button>
                )}
                {c.status === 'acquired' && <span className="badge badge-accent"><Check size={12} /> Acquired — choose a route</span>}
                {c.status === 'done' && (
                  <button className="btn btn-outline" onClick={resetChallenge}>
                    <RotateCcw size={14} /> Play again
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid g3">
            {CHALLENGE_ROUTES.map((r) => {
              const isRunning = route === r.id
              const chosen = c.status === 'done' && c.route === r.title
              return (
                <div key={r.id} className={`card card-pad stack gap12 ${chosen ? 'fade-in' : ''}`} style={{ borderColor: isRunning || chosen ? 'var(--ink)' : undefined }}>
                  <div className="row between">
                    <span className="strong mono" style={{ letterSpacing: '.08em' }}>{r.title.toUpperCase()}</span>
                    {chosen && <span className="badge badge-accent">Your route</span>}
                  </div>
                  <div>
                    <div className="small muted">Potential</div>
                    <div style={{ fontSize: 32, fontWeight: 850, letterSpacing: '-0.03em' }} className={r.id === 'bundle' ? 'accent' : ''}>
                      {sgd(r.potential)}
                    </div>
                    <div className="tiny muted">{r.effort} · {Math.round((r.potential / 5 - 1) * 100)}% return</div>
                  </div>
                  <p className="small muted">{r.detail}</p>
                  {isRunning ? (
                    <div className="check-list">
                      {r.steps.map((s, i) => (
                        <div key={s} className={`check-item small ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                          <span className="ci" style={{ width: 18, height: 18 }}>{i < step && <Check size={11} />}</span>
                          {s}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 'auto' }} disabled={c.status !== 'acquired' || !!route} onClick={() => setRoute(r.id)}>
                      {c.status === 'idle' ? 'Acquire the tee first' : c.status === 'done' ? 'Challenge complete' : `Go ${r.title.toLowerCase()}`}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {c.status === 'done' && c.result !== undefined && (
            <div className="card card-dark card-pad fade-in row between wrap" style={{ gap: 16 }}>
              <div>
                <div className="eyebrow" style={{ color: '#8b938e' }}>Challenge result</div>
                <div style={{ fontSize: 40, fontWeight: 850, letterSpacing: '-0.04em', marginTop: 4 }}>
                  S$5 → <span style={{ color: 'var(--accent-bright)' }}>{sgd(c.result)}</span>
                </div>
                <div className="small muted">
                  {c.route} route · {sgd(c.result)} credited to your RE:PLAY Cash · {c.result >= 30 ? 'Challenge beaten!' : `${sgd(30 - c.result)} short of the target — try Bundle next week.`}
                </div>
              </div>
              <Trophy size={48} color="#3DDC97" />
            </div>
          )}

          <div className="grid g2">
            {OTHER_CHALLENGES.map((o) => (
              <div key={o.title} className="card" style={{ display: 'grid', gridTemplateColumns: '90px 1fr', overflow: 'hidden' }}>
                <ProductImage src={o.img} alt={o.title} style={{ height: '100%', minHeight: 90 }} />
                <div className="card-pad" style={{ padding: 14 }}>
                  <div className="row between">
                    <span className="strong">{o.title}</span>
                    <span className="badge">Upcoming</span>
                  </div>
                  <div className="small mt8">
                    Turn <b>{sgd(o.from)}</b> into <b className="accent">{sgd(o.to)}</b>
                  </div>
                  <div className="tiny muted mt8 row" style={{ gap: 10 }}>
                    <span className="row" style={{ gap: 3 }}><Users size={11} /> {o.players} registered</span>
                    <span>Starts in {o.ends}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title row" style={{ gap: 8 }}>
              <Trophy size={15} /> Community leaderboard
            </div>
            <span className="small muted">This week</span>
          </div>
          {state.leaderboard.map((e, i) => (
            <div key={e.name} className={`leader-row ${e.you ? 'you fade-in' : ''}`}>
              <span className={`rank ${i === 0 ? 'r1' : ''}`}>{i + 1}</span>
              <span className="strong">{e.name}</span>
              <span className="small muted">{e.route}</span>
              <b className="num">{sgd(e.result)}</b>
            </div>
          ))}
          <div className="card-body small muted row" style={{ gap: 8, borderTop: '1px solid var(--line-2)' }}>
            <Users size={14} className="accent" style={{ flex: 'none' }} /> 1,284 second-hand tees given a new life by challengers this week.
          </div>
        </div>
      </div>
    </div>
  )
}

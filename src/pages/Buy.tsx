import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, LogIn, Pencil, ShieldCheck, ShoppingBag, Sparkles, Truck } from 'lucide-react'
import { CountUp, ItemVisual, LifeScore, ProductImage, SimTag } from '../components/common/ui'
import { sgd } from '../lib/format'
import { DELIVERY_FEE, DELIVERY_LABEL, orderTotals } from '../lib/orders'
import { valuate } from '../data/catalog'
import { useStore } from '../store/store'

const ANALYSIS = ['Confirming your payment', 'Grading condition from the seller’s photos', 'Pricing resale, transformation & material value', 'Finding its highest-value next life']

export default function Buy() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const { state, user, balance, buyProduct, addToCart, keepItem, findProduct } = useStore()
  const product = findProduct(id)
  const mine = !!user && product?.sellerId === user.id
  const unavailable = !!product?.listingStatus && product.listingStatus !== 'active'
  const itemId = params.get('item')
  const item = state.portfolio.find((i) => i.id === itemId)
  const [stage, setStage] = useState<'checkout' | 'analysing' | 'revealed'>(itemId ? 'revealed' : 'checkout')
  const [step, setStep] = useState(0)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    if (stage !== 'analysing') return
    setStep(0)
    const timers = ANALYSIS.map((_, i) => setTimeout(() => setStep(i + 1), 650 * (i + 1)))
    timers.push(setTimeout(() => setStage('revealed'), 650 * ANALYSIS.length + 400))
    return () => timers.forEach(clearTimeout)
  }, [stage])

  if (!product || (unavailable && !itemId)) {
    return (
      <div className="container page empty">
        {product ? 'This item has already sold or is no longer listed.' : 'Item not found.'} <Link className="link" to="/discover">Back to Discover</Link>
      </div>
    )
  }

  const v = valuate(product)
  const { delivery, total } = orderTotals([product.price])
  const inBag = state.cart.includes(product.id)
  const owned = state.portfolio.some((i) => i.sourceProductId === product.id && i.status !== 'sold' && i.status !== 'returned')

  const pay = async () => {
    if (paying) return
    setPaying(true)
    const newId = await buyProduct(product.id)
    setPaying(false)
    if (!newId) return
    setParams({ item: newId }, { replace: true })
    setStage('analysing')
  }

  const best = item ? Math.max(item.transform, item.resale) : 0
  const paid = item ? item.bought + (item.shipping ?? 0) : total

  return (
    <div className="dark-page" style={{ background: 'var(--dark)', color: '#fff', minHeight: 'calc(100vh - 92px)' }}>
      <div className="container page">
        <div className="row between wrap" style={{ marginBottom: 18 }}>
          <Link to="/discover" className="btn btn-dark-outline btn-sm">
            <ArrowLeft size={14} /> Discover
          </Link>
          <span className="sim-tag" style={{ color: '#A68BC9', borderColor: '#6A4E94' }}>
            Simulated checkout · no real money moves
          </span>
        </div>

        {stage === 'checkout' && (
          <div className="grid g2 fade-in" style={{ gap: 40, alignItems: 'center', paddingTop: 8 }}>
            <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
              <ProductImage src={product.img} alt={product.name} style={{ aspectRatio: '4/4' }} />
              <div style={{ position: 'absolute', top: 14, left: 14 }} className="row">
                <span className="badge" style={{ background: 'rgba(255,253,252,.92)' }}>Pre-owned</span>
                <span className="badge badge-dark">{product.rarity}</span>
              </div>
            </div>
            <div className="stack gap16">
              <div>
                <div className="mono tiny" style={{ color: '#A68BC9', letterSpacing: '.12em' }}>
                  {product.brand.toUpperCase()} · {product.conditionLabel.toUpperCase()}
                </div>
                <h1 style={{ fontSize: 40, fontWeight: 850, letterSpacing: '-0.04em', marginTop: 6 }}>{product.name}</h1>
                <div className="small mt8" style={{ color: '#C3B0E2' }}>
                  {product.size ? `Size ${product.size} · ` : ''}Sold by {product.seller}
                </div>
                {product.description && (
                  <p className="small mt12" style={{ color: '#D9C6F7', maxWidth: 520 }}>
                    {product.description}
                  </p>
                )}
              </div>
              <div className="value-ladder">
                <div className="rowv">
                  <span className="l">Original retail price</span>
                  <span className="v" style={{ textDecoration: 'line-through', color: '#A68BC9' }}>{sgd(product.originalPrice)}</span>
                </div>
                <div className="rowv">
                  <span className="l">RE:PLAY price</span>
                  <span className="v">{sgd(product.price)}</span>
                </div>
                <div className="rowv">
                  <span className="l row" style={{ gap: 6 }}>
                    <Truck size={14} /> {DELIVERY_LABEL}
                  </span>
                  <span className="v">{sgd(delivery, 2)}</span>
                </div>
                <div className="rowv" style={{ background: '#4A3075' }}>
                  <span className="l" style={{ color: '#fff', fontWeight: 650 }}>Total</span>
                  <span className="v" style={{ fontSize: 18 }}>{sgd(total, 2)}</span>
                </div>
              </div>
              <div className="row small" style={{ gap: 8, color: '#C3B0E2' }}>
                <Sparkles size={14} color="#D9C6F7" /> AI estimate: resale {sgd(v.resaleValue)} · transformed up to <b style={{ color: 'var(--accent-bright)' }}>{sgd(v.transformationValue)}</b>
              </div>
              {mine ? (
                <div className="stack gap8">
                  <div className="row wrap" style={{ gap: 12 }}>
                    <span className="badge badge-accent" style={{ height: 30, padding: '0 12px' }}>
                      <Check size={13} /> Your listing · Active
                    </span>
                    <Link className="btn btn-lg btn-dark-outline" to={`/sell?edit=${product.id}`}>
                      <Pencil size={16} /> Edit listing
                    </Link>
                  </div>
                  <span className="small" style={{ color: '#A68BC9' }}>This is how shoppers see your item. Manage it in Account → My Listings.</span>
                </div>
              ) : !user ? (
                <div className="stack gap8">
                  <div className="row wrap" style={{ gap: 12 }}>
                    <Link className="btn btn-lg btn-accent" to={`/account?next=${encodeURIComponent(`/buy/${product.id}`)}`}>
                      <LogIn size={16} /> Sign in to buy
                    </Link>
                    <Link className="btn btn-lg btn-dark-outline" to={`/account?mode=signup&next=${encodeURIComponent(`/buy/${product.id}`)}`}>
                      Create account
                    </Link>
                  </div>
                  <span className="small" style={{ color: '#A68BC9' }}>A free RE:PLAY account keeps your purchases, listings and fit profile together.</span>
                </div>
              ) : (
                <div className="stack gap8">
                  <div className="row wrap" style={{ gap: 12 }}>
                    <button className="btn btn-lg btn-accent" onClick={pay} disabled={paying}>
                      <ShieldCheck size={16} /> Pay {sgd(total, 2)}
                    </button>
                    {inBag ? (
                      <Link className="btn btn-lg btn-dark-outline" to="/bag">
                        <ShoppingBag size={16} /> In your bag · view
                      </Link>
                    ) : (
                      <button className="btn btn-lg btn-dark-outline" onClick={() => addToCart(product.id)}>
                        <ShoppingBag size={16} /> Add to bag
                      </button>
                    )}
                  </div>
                  <span className="small" style={{ color: '#A68BC9' }}>
                    Paid from RE:PLAY Cash · balance {sgd(balance, 2)} · {sgd(DELIVERY_FEE, 2)} delivery is charged once per order — add more items to your bag, still {sgd(DELIVERY_FEE, 2)}.
                  </span>
                </div>
              )}
              {owned && <p className="tiny" style={{ color: '#A68BC9' }}>You already own one of these — it’s in your collection.</p>}
            </div>
          </div>
        )}

        {stage === 'analysing' && (
          <div className="reveal-stage">
            <div className="stack fade-in" style={{ alignItems: 'center', gap: 36 }}>
              <div className="scan">
                <div className="scan-ring" />
                <div className="scan-ring r2" />
                <div className="scan-ring r3" />
                <div className="scan-sweep" />
                <div className="scan-core">AI</div>
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 750, textAlign: 'center' }}>Your opportunity is being analysed…</h2>
              <div className="stack gap8" style={{ minWidth: 300 }}>
                {ANALYSIS.map((a, i) => (
                  <div key={a} className="row small" style={{ gap: 10, color: i < step ? '#fff' : i === step ? '#D9C6F7' : '#6E5596', transition: 'color .3s' }}>
                    <span style={{ width: 16, color: 'var(--accent-bright)' }}>{i < step ? '✓' : i === step ? '›' : '·'}</span>
                    {a}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {stage === 'revealed' && item && (
          <div className="grid g2" style={{ gap: 40, alignItems: 'start', paddingTop: 8 }}>
            <div className="reveal-in" style={{ borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
              <ItemVisual item={{ ...item, mock: undefined }} style={{ aspectRatio: '4/4.2' }} />
              <div style={{ position: 'absolute', top: 14, left: 14 }} className="row">
                <span className="badge badge-accent">
                  <Check size={12} /> Yours
                </span>
                <span className="badge" style={{ background: 'rgba(255,253,252,.92)' }}>Pre-owned</span>
              </div>
            </div>
            <div className="stack gap16">
              <div className="reveal-in d1">
                <div className="mono tiny" style={{ color: '#A68BC9', letterSpacing: '.12em' }}>
                  {item.brand.toUpperCase()} · SECOND-HAND · {(item.conditionLabel ?? 'Pre-owned').replace(/^Pre-(owned|loved) — /, '').toUpperCase()}
                </div>
                <h1 style={{ fontSize: 40, fontWeight: 850, letterSpacing: '-0.04em', marginTop: 6 }}>{item.name}</h1>
              </div>
              <div className="value-ladder reveal-in d2">
                <div className="rowv">
                  <span className="l">Original value</span>
                  <span className="v" style={{ textDecoration: 'line-through', color: '#A68BC9' }}>{sgd(product.originalPrice)}</span>
                </div>
                <div className="rowv">
                  <span className="l">You paid (incl. {sgd(item.shipping ?? 0, 2)} {item.shipping === DELIVERY_FEE ? DELIVERY_LABEL : `share of ${DELIVERY_LABEL}`})</span>
                  <span className="v">{sgd(paid, 2)}</span>
                </div>
                <div className="rowv">
                  <span className="l">Current resale estimate</span>
                  <span className="v">{sgd(item.resale)}</span>
                </div>
                <div className="rowv">
                  <span className="l">Transformation potential</span>
                  <span className="v" style={{ color: 'var(--accent-bright)' }}>{sgd(item.transform)}</span>
                </div>
                <div className="rowv">
                  <span className="l">Material recovery</span>
                  <span className="v">{sgd(item.material)}</span>
                </div>
              </div>
              <div className="reveal-in d3 row between wrap" style={{ alignItems: 'flex-end', borderTop: '1px solid var(--dark-line)', paddingTop: 16 }}>
                <div>
                  <div className="eyebrow" style={{ color: '#A68BC9' }}>RE:PLAY Value</div>
                  <div className="big-value">
                    <CountUp from={paid} value={best} duration={1300} />
                  </div>
                </div>
                <div className="right">
                  <div className="badge badge-accent" style={{ fontSize: 13, height: 28, padding: '0 12px' }}>
                    Potential value uplift: +{Math.round(((best - paid) / paid) * 100)}%
                  </div>
                  <div className="mt8">
                    <LifeScore score={item.lifeScore} />
                  </div>
                </div>
              </div>

              {item.status === 'owned' ? (
                <div className="grid reveal-in d4" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    className="action-tile"
                    onClick={() => {
                      keepItem(item.id)
                      nav('/dashboard')
                    }}
                  >
                    <div className="t">KEEP</div>
                    <div className="v">{sgd(item.current)}</div>
                    <div className="d">Add to your collection</div>
                  </button>
                  <button className="action-tile" style={{ borderColor: 'var(--accent-bright)' }} onClick={() => nav(`/transform/${item.id}`)}>
                    <div className="t row between">
                      TRANSFORM <span className="badge badge-accent" style={{ height: 18, fontSize: 9.5 }}>BEST</span>
                    </div>
                    <div className="v">up to {sgd(item.transform)}</div>
                    <div className="d">Alter it or upcycle it</div>
                  </button>
                </div>
              ) : (
                <div className="card-dark reveal-in" style={{ border: '1px solid var(--dark-line)', borderRadius: 10, padding: 16 }}>
                  <div className="strong">This item is already on its next life.</div>
                  <div className="row mt12 wrap">
                    <Link className="btn btn-light btn-sm" to={`/transform/${item.id}`}>
                      View transformation
                    </Link>
                    <Link className="btn btn-dark-outline btn-sm" to={`/passport/${item.passportId}`}>
                      Life Passport
                    </Link>
                  </div>
                </div>
              )}
              <div className="reveal-in d5">
                <SimTag>Values from calculateCircularValue() — deterministic simulation</SimTag>
              </div>
            </div>
          </div>
        )}

        {stage === 'revealed' && !item && (
          <div className="empty" style={{ color: '#C3B0E2' }}>
            This purchase is no longer available. <Link className="link" to="/discover">Back to Discover</Link>
          </div>
        )}
      </div>
    </div>
  )
}

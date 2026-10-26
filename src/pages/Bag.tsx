import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, ShieldCheck, ShoppingBag, Sparkles, Trash2, Truck } from 'lucide-react'
import { PageHead, ProductImage, SimTag, sgd } from '../components/ui'
import { DELIVERY_FEE, DELIVERY_LABEL, orderTotals, type Product } from '../lib/data'
import { useStore } from '../lib/store'

interface Placed {
  lines: { product: Product; itemId: string }[]
  subtotal: number
  delivery: number
  total: number
}

function Summary({ count, subtotal, delivery, total, children }: { count: number; subtotal: number; delivery: number; total: number; children?: React.ReactNode }) {
  return (
    <div className="card card-pad stack gap12 order-summary">
      <div className="card-title">Order summary</div>
      <div className="ledger">
        <div className="ledger-row">
          <span>
            Subtotal · {count} item{count === 1 ? '' : 's'}
          </span>
          <b>{sgd(subtotal, 2)}</b>
        </div>
        <div className="ledger-row">
          <span className="row" style={{ gap: 6 }}>
            <Truck size={13} /> {DELIVERY_LABEL}
          </span>
          <b>{sgd(delivery, 2)}</b>
        </div>
        <div className="ledger-row total">
          <span>Total</span>
          <b>{sgd(total, 2)}</b>
        </div>
      </div>
      <div className="tiny muted">One flat {sgd(DELIVERY_FEE, 2)} delivery fee per order, anywhere in Singapore — not per item.</div>
      {children}
    </div>
  )
}

export default function Bag() {
  const { state, balance, buyOrder, removeFromCart, setRole, findProduct } = useStore()
  const [placed, setPlaced] = useState<Placed | null>(null)
  const products = state.cart.map(findProduct).filter((p): p is Product => !!p && (!p.listingStatus || p.listingStatus === 'active'))
  const { subtotal, delivery, total } = orderTotals(products.map((p) => p.price))

  const [paying, setPaying] = useState(false)
  const checkout = async () => {
    setPaying(true)
    const bought = await buyOrder(products.map((p) => p.id))
    setPaying(false)
    if (!bought) return
    // An item someone else bought first is dropped from the order, so the receipt is built from what was actually bought.
    const lines = bought.map((b) => ({ product: products.find((p) => p.id === b.productId)!, itemId: b.itemId }))
    setPlaced({ lines, ...orderTotals(lines.map((l) => l.product.price)) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (placed) {
    return (
      <div className="container page">
        <PageHead eyebrow="Order confirmed" title="Thanks — your order is on its way" subtitle={`${placed.lines.length} pre-owned item${placed.lines.length === 1 ? '' : 's'} by ${DELIVERY_LABEL}. Each one has been valued by the AI — see what it could become next.`} right={<SimTag>Simulated order · no real money moves</SimTag>} />
        <div className="bag-grid">
          <div className="stack gap12">
            {placed.lines.map(({ product: p, itemId }) => (
              <div key={itemId} className="card bag-line">
                <ProductImage src={p.img} alt={p.name} className="bag-img" />
                <div className="bag-info">
                  <div className="pcard-brand">{p.brand}</div>
                  <div className="pcard-name">{p.name}</div>
                  <div className="small muted">{p.size ? `Size ${p.size} · ` : ''}{p.conditionLabel}</div>
                  <Link className="btn btn-outline btn-sm mt8" style={{ alignSelf: 'flex-start' }} to={`/buy/${p.id}?item=${itemId}`}>
                    <Sparkles size={13} /> See AI value & transform
                  </Link>
                </div>
                <div className="bag-price">{sgd(p.price)}</div>
              </div>
            ))}
          </div>
          <Summary count={placed.lines.length} subtotal={placed.subtotal} delivery={placed.delivery} total={placed.total}>
            <div className="badge badge-accent" style={{ alignSelf: 'flex-start', height: 26 }}>
              <Check size={12} /> Paid {sgd(placed.total, 2)} from RE:PLAY Cash
            </div>
            <Link className="btn btn-primary btn-block" to="/dashboard">
              Go to your collection <ArrowRight size={14} />
            </Link>
          </Summary>
        </div>
      </div>
    )
  }

  return (
    <div className="container page">
      <PageHead eyebrow="Checkout" title="Your bag" subtitle={`Everything in your bag ships together by ${DELIVERY_LABEL} — one ${sgd(DELIVERY_FEE, 2)} fee for the whole order.`} right={<SimTag>Simulated checkout · no real money moves</SimTag>} />
      {products.length === 0 ? (
        <div className="card empty stack" style={{ alignItems: 'center', gap: 10 }}>
          <ShoppingBag size={22} />
          <div className="strong" style={{ color: 'var(--ink)' }}>Your bag is empty</div>
          <div>Add pre-owned pieces from Discover — delivery stays {sgd(DELIVERY_FEE, 2)} per order however many you add.</div>
          <Link className="btn btn-primary mt8" to="/discover">
            Browse Discover <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="bag-grid">
          <div className="stack gap12">
            {products.map((p) => (
              <div key={p.id} className="card bag-line">
                <Link to={`/buy/${p.id}`}>
                  <ProductImage src={p.img} alt={p.name} className="bag-img" />
                </Link>
                <div className="bag-info">
                  <div className="pcard-brand">{p.brand}</div>
                  <Link to={`/buy/${p.id}`} className="pcard-name">
                    {p.name}
                  </Link>
                  <div className="small muted">{p.size ? `Size ${p.size} · ` : ''}{p.conditionLabel}</div>
                  <button className="link-btn mt8 row" style={{ gap: 4, color: 'var(--muted)' }} onClick={() => removeFromCart(p.id)}>
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
                <div className="bag-price">{sgd(p.price)}</div>
              </div>
            ))}
            <Link className="link small" to="/discover">
              + Add more items — delivery stays {sgd(DELIVERY_FEE, 2)}
            </Link>
          </div>
          <Summary count={products.length} subtotal={subtotal} delivery={delivery} total={total}>
            {state.role === 'consumer' ? (
              <>
                <button className="btn btn-accent btn-lg btn-block" onClick={checkout} disabled={paying}>
                  <ShieldCheck size={16} /> Pay {sgd(total, 2)}
                </button>
                <div className="tiny muted">Paid from RE:PLAY Cash · balance {sgd(balance, 2)}</div>
              </>
            ) : (
              <button className="btn btn-primary btn-block" onClick={() => setRole('consumer')}>
                Switch to Consumer to buy
              </button>
            )}
          </Summary>
        </div>
      )}
    </div>
  )
}

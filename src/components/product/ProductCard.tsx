import { ArrowRight, Truck } from 'lucide-react'
import { DELIVERY_FEE, DELIVERY_LABEL } from '../../lib/orders'
import { kindOf, valuate, type Product } from '../../data/catalog'
import { LifeScore, ProductImage } from '../common/ui'
import { sgd } from '../../lib/format'

function rarityClass(r: string) {
  return r === 'Rare' ? 'badge-dark' : r === 'Limited' ? 'badge-gold' : ''
}

/** The marketplace product card — used for seeded products, user listings and the seller's listing preview alike. */
export default function ProductCard({ p, onOpen }: { p: Product; onOpen?: () => void }) {
  const v = valuate(p)
  return (
    <div className="card card-hover pcard" data-kind={kindOf(p)} data-price={p.price} onClick={onOpen} style={{ cursor: onOpen ? 'pointer' : 'default' }}>
      <div style={{ position: 'relative' }}>
        <ProductImage src={p.img} alt={p.name} />
        <div className="pcard-tags">
          <span className={`badge ${rarityClass(p.rarity)}`}>{p.rarity}</span>
          <span className="badge" style={{ background: 'rgba(255,253,252,.92)' }}>−{Math.round((1 - p.price / p.originalPrice) * 100)}%</span>
        </div>
      </div>
      <div className="pcard-body">
        <div>
          <div className="pcard-brand">{p.brand}</div>
          <div className="pcard-name">{p.name}</div>
        </div>
        <div className="price-row">
          <span className="price-now">{sgd(p.price)}</span>
          <span className="strike small">{p.section === 'creator' ? `input ${sgd(p.originalPrice)}` : sgd(p.originalPrice)}</span>
        </div>
        <div className="metric-strip">
          <div>
            <div className="l">Original</div>
            <div className="v">{sgd(p.originalPrice)}</div>
          </div>
          <div>
            <div className="l">RE:PLAY</div>
            <div className="v">{sgd(p.price)}</div>
          </div>
          <div>
            <div className="l">Transformed</div>
            <div className="v accent">{sgd(v.transformationValue)}</div>
          </div>
        </div>
        <div className="pcard-transform">
          Transform up to <b className="accent">{sgd(v.transformationValue)}</b>
        </div>
        <div className="pcard-delivery">
          <Truck size={11} /> {DELIVERY_LABEL} · {sgd(DELIVERY_FEE, 2)} per order
        </div>
        <div className="row between">
          <LifeScore score={p.life} />
          <span className="tiny muted">{p.conditionLabel}</span>
        </div>
        <button className="btn btn-primary btn-sm btn-block" style={{ marginTop: 'auto' }} tabIndex={onOpen ? undefined : -1}>
          Buy now <ArrowRight size={13} />
        </button>
      </div>
    </div>
  )
}

import type { GarmentProfile, Idea } from '../../lib/ideas'
import { DELIVERY_LABEL } from '../../lib/orders'
import { sgd } from '../../lib/format'
import { money } from './format'

/** Itemised cost basis → sale price → profit for one idea. */
export default function Ledger({ p, idea, dark }: { p: GarmentProfile; idea: Idea; dark?: boolean }) {
  return (
    <div className={`ledger ${dark ? 'dark' : ''}`}>
      <div className="ledger-row">
        <span>Second-hand {p.garment}</span>
        <b>{sgd(p.itemCost)}</b>
      </div>
      {p.shippingIn > 0 && (
        <div className="ledger-row">
          <span>+ {DELIVERY_LABEL} to you</span>
          <b>{sgd(p.shippingIn, 2)}</b>
        </div>
      )}
      <div className="ledger-row">
        <span>+ Transformation · {idea.maker}</span>
        <b>{sgd(idea.cost)}</b>
      </div>
      <div className="ledger-row">
        <span>+ {DELIVERY_LABEL} to buyer</span>
        <b>{sgd(idea.shippingOut, 2)}</b>
      </div>
      <div className="ledger-row total">
        <span>= Total investment</span>
        <b>{sgd(idea.investment, 2)}</b>
      </div>
      <div className="ledger-row">
        <span>Estimated resale price</span>
        <b>{sgd(idea.sale)}</b>
      </div>
      <div className="ledger-row">
        <span>− Total investment</span>
        <b>{sgd(idea.investment, 2)}</b>
      </div>
      <div className={`ledger-row profit ${idea.profit < 0 ? 'neg' : ''}`}>
        <span>Potential profit</span>
        <b>{money(idea.profit)}</b>
      </div>
    </div>
  )
}

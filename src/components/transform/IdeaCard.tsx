import { Check, Clock, Sparkles } from 'lucide-react'
import type { GarmentProfile, Idea } from '../../lib/ideas'
import { sgd } from '../../lib/format'
import { ProductMock } from '../product/ProductMock'
import { DIFF_CLASS, money } from './format'

/** One of the three recommended upcycling ideas, with its money breakdown. */
export default function IdeaCard({ idea, index, p, filtered, onSelect }: { idea: Idea; index: number; p: GarmentProfile; filtered: boolean; onSelect: () => void }) {
  return (
    <div className={`card idea-card reveal-in ${idea.misses.length ? 'idea-alt' : ''}`} style={{ animationDelay: `${index * 0.1}s` }}>
      <div className="idea-visual">
        <ProductMock {...idea.mock} title={idea.title} style={{ position: 'absolute', inset: 0 }} />
        <span className="idea-no mono">0{index + 1}</span>
        <span className="badge idea-type">{idea.type}</span>
        {filtered && !idea.misses.length && (
          <span className="badge badge-accent idea-flag">
            <Check size={11} /> Matches your filters
          </span>
        )}
        {idea.misses.length > 0 && <span className="badge badge-warn idea-flag">Closest alternative</span>}
      </div>
      <div className="card-pad stack gap12" style={{ flex: 1 }}>
        <div>
          <h3 style={{ fontSize: 19 }}>{idea.title}</h3>
          <div className="small muted mt8">Made from your second-hand {p.garment}</div>
          {idea.misses.length > 0 && <div className="idea-miss">Doesn’t match: {idea.misses.join(' · ')}</div>}
        </div>
        <div className="idea-money">
          <div>
            <div className="l">Estimated sale</div>
            <div className="v">{sgd(idea.sale)}</div>
          </div>
          <div>
            <div className="l">Transformation</div>
            <div className="v">{sgd(idea.cost)}</div>
          </div>
        </div>
        <div className="idea-profit">
          <div>
            <div className="l">Potential profit</div>
            <div className="tiny muted">
              after {sgd(idea.investment, 2)} total: item, making & delivery
            </div>
          </div>
          <div className={`v ${idea.profit < 0 ? 'neg' : ''}`}>{money(idea.profit)}</div>
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          <span className={`diff ${DIFF_CLASS[idea.difficulty]}`}>
            <i /> {idea.difficulty}
          </span>
          <span className="badge badge-outline">{idea.style}</span>
          <span className="tiny muted row" style={{ gap: 4 }}>
            <Clock size={11} /> {idea.days} days
          </span>
        </div>
        <div className="why">
          <div className="why-h">
            <Sparkles size={11} /> Why this?
          </div>
          <p>{idea.why}</p>
        </div>
        <button className="btn btn-primary btn-block" style={{ marginTop: 'auto' }} onClick={onSelect}>
          Select
        </button>
      </div>
    </div>
  )
}

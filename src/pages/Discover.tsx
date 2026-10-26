import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, SlidersHorizontal, Truck } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import { PageHead, SimTag, sgd } from '../components/ui'
import { KINDS, DELIVERY_FEE, DELIVERY_LABEL, kindOf, valuate, type Kind, type Product } from '../lib/data'
import { useStore } from '../lib/store'

type Sort = 'featured' | 'price-asc' | 'price-desc' | 'discount' | 'transform'
const SORTS: { id: Sort; label: string }[] = [
  { id: 'featured', label: 'Featured' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'discount', label: 'Biggest discount' },
  { id: 'transform', label: 'Highest transform value' },
]

function sortItems(items: Product[], sort: Sort) {
  const list = [...items]
  switch (sort) {
    case 'price-asc':
      return list.sort((a, b) => a.price - b.price)
    case 'price-desc':
      return list.sort((a, b) => b.price - a.price)
    case 'discount':
      return list.sort((a, b) => a.price / a.originalPrice - b.price / b.originalPrice)
    case 'transform':
      return list.sort((a, b) => valuate(b).transformationValue - valuate(a).transformationValue)
    default:
      return list
  }
}

export default function Discover() {
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const { products } = useStore()
  const inTab = products
  const kindCounts = useMemo(() => Object.fromEntries(KINDS.map((k) => [k, inTab.filter((p) => kindOf(p) === k).length])), [products]) // eslint-disable-line react-hooks/exhaustive-deps
  const requestedKind = params.get('type') as Kind | null
  const kind: Kind | null = requestedKind && KINDS.includes(requestedKind) && kindCounts[requestedKind] > 0 ? requestedKind : null
  const sort = (params.get('sort') as Sort) || 'featured'
  const items = sortItems(kind ? inTab.filter((p) => kindOf(p) === kind) : inTab, SORTS.some((x) => x.id === sort) ? sort : 'featured')
  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k)
    setParams(next, { replace: true })
  }

  return (
    <div className="container page">
      <PageHead
        display
        eyebrow="Circular marketplace"
        title="Discover Value"
        subtitle="Pre-owned clothing, previously loved and ready for a second life — each priced below its AI-estimated next-life value."
        right={
          <>
            <SimTag>
              <Truck size={11} /> {DELIVERY_LABEL} — {sgd(DELIVERY_FEE, 2)} per order
            </SimTag>
            <Link to="/sell" className="btn btn-accent btn-sm">
              <Plus size={14} /> Sell an Item
            </Link>
          </>
        }
      />

      <div className="shop-filters">
        <div className="chips" role="group" aria-label="Filter by clothing type">
          <button type="button" className={`chip ${!kind ? 'on' : ''}`} onClick={() => update({ type: null })}>
            All <span className="chip-count">{inTab.length}</span>
          </button>
          {KINDS.filter((k) => kindCounts[k] > 0).map((k) => (
            <button key={k} type="button" className={`chip ${kind === k ? 'on' : ''}`} onClick={() => update({ type: kind === k ? null : k })}>
              {k} <span className="chip-count">{kindCounts[k]}</span>
            </button>
          ))}
        </div>
        <label className="sort">
          <SlidersHorizontal size={14} />
          <select className="input" value={sort} onChange={(e) => update({ sort: e.target.value === 'featured' ? null : e.target.value })} aria-label="Sort">
            {SORTS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="small muted" style={{ margin: '4px 0 14px' }}>
        Showing {items.length} {kind ? kind.toLowerCase() : 'items'}
      </div>

      <div className="grid g4 shop-grid">
        {items.map((p) => (
          <ProductCard key={p.id} p={p} onOpen={() => nav(`/buy/${p.id}`)} />
        ))}
      </div>
    </div>
  )
}

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, Check, Cpu, Info, X } from 'lucide-react'
import type { PortfolioItem } from '../../data/demo-account'
import { garmentMock, profileOf } from '../../lib/ideas'
import { useStore } from '../../store/store'
import { ProductMock } from '../product/ProductMock'
import { sgd } from '../../lib/format'

export function ProductImage({ src, alt, className = '', style, fallback }: { src: string; alt: string; className?: string; style?: React.CSSProperties; fallback?: ReactNode }) {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  return (
    <div className={`pimg ${state === 'loading' ? 'loading' : ''} ${className}`} style={style}>
      {state !== 'error' && <img src={src} alt={alt} loading="lazy" onLoad={() => setState('ok')} onError={() => setState('error')} />}
      {state === 'error' && fallback ? <div className="pimg-fallback">{fallback}</div> : state !== 'ok' && <div className="pimg-fallback">{state === 'error' ? alt : ''}</div>}
    </div>
  )
}

/** A portfolio item's visual: the drawn new product once transformed, otherwise its photo (with a drawn fallback). */
export function ItemVisual({ item, style, className }: { item: PortfolioItem; style?: React.CSSProperties; className?: string }) {
  if (item.mock) return <ProductMock {...item.mock} style={style} className={className} title={item.name} />
  return <ProductImage src={item.img} alt={item.name} style={style} className={className} fallback={<ProductMock {...garmentMock(profileOf(item))} title={item.name} />} />
}

export function LifeScore({ score, max = 4 }: { score: number; max?: number }) {
  return (
    <span className="life" title="Life Score — how many economic lives this product has had">
      <span className="life-dots">
        {Array.from({ length: max }, (_, i) => (
          <i key={i} className={i < score ? 'on' : ''} />
        ))}
      </span>
      Life {score}/{max}
    </span>
  )
}

export function SimTag({ children = 'Prototype simulation' }: { children?: ReactNode }) {
  return (
    <span className="sim-tag">
      <Cpu size={11} /> {children}
    </span>
  )
}

export function Modal({ open, onClose, title, children, size }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; size?: 'lg' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size === 'lg' ? 'modal-lg' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div className="card-title" style={{ fontSize: 15 }}>
            {title}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export function Toasts() {
  const { toasts, dismissToast } = useStore()
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone ?? 'success'}`} onClick={() => dismissToast(t.id)}>
          <span className="ti">{t.tone === 'error' ? <AlertTriangle size={12} /> : t.tone === 'info' ? <Info size={12} /> : <Check size={12} />}</span>
          <div>
            <div className="t">{t.title}</div>
            {t.body && <div className="b">{t.body}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Animates a number from its previous value to the new one. */
export function CountUp({ value, format = (n: number) => sgd(Math.round(n)), duration = 900, from }: { value: number; format?: (n: number) => string; duration?: number; from?: number }) {
  const [display, setDisplay] = useState(from ?? value)
  const shown = useRef(from ?? value)
  useEffect(() => {
    const start = shown.current
    const end = value
    if (start === end) return
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      const v = start + (end - start) * (1 - Math.pow(1 - p, 3))
      shown.current = v
      setDisplay(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <span className="countup">{format(display)}</span>
}

/** Full-page placeholder while an account, listing or lazily loaded page is on its way. */
export function PageLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="container page empty" aria-busy="true">
      {label}
    </div>
  )
}

export function PageHead({ eyebrow, title, subtitle, right, display }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; right?: ReactNode; display?: boolean }) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && (
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            <span className="dot" />
            {eyebrow}
          </div>
        )}
        <h1 className={display ? 'display' : 'title'}>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {right && <div className="row wrap">{right}</div>}
    </div>
  )
}

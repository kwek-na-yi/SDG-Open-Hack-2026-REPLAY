import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, ImagePlus, RefreshCw, Sparkles, Truck } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import { PageHead, SimTag, sgd } from '../components/ui'
import { CATEGORY_OPTIONS, CONDITIONS, MATERIAL_OPTIONS, estimateOriginal, handleOf, listingToProduct, type ConditionId, type Listing, type ListingInput } from '../lib/account'
import { DELIVERY_FEE, DELIVERY_LABEL, valuate } from '../lib/data'
import type { Category, Material } from '../lib/engine'
import { useStore } from '../lib/store'
import { LoadingAccount } from './Account'

const MAX_UPLOAD_MB = 15

/** Shrinks a photo to at most 900px and re-encodes it as JPEG so listings fit in browser storage. */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, 900 / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('canvas'))
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('decode'))
    }
    img.src = url
  })
}

interface Draft {
  img: string
  name: string
  price: string
  category: Category
  condition: ConditionId
  brand: string
  size: string
  material: Material | ''
  originalPrice: string
  description: string
}
type Errors = Partial<Record<'img' | 'name' | 'price' | 'originalPrice', string>>

const blank: Draft = { img: '', name: '', price: '', category: 'jacket', condition: 'very-good', brand: '', size: '', material: '', originalPrice: '', description: '' }
const draftOfListing = (l: Listing): Draft => ({
  img: l.img,
  name: l.name,
  price: String(l.price),
  category: l.category,
  condition: l.condition,
  brand: l.brand ?? '',
  size: l.size ?? '',
  material: l.material ?? '',
  originalPrice: l.originalPrice ? String(l.originalPrice) : '',
  description: l.description ?? '',
})

const toCents = (s: string) => Math.round(Number(s) * 100) / 100

function validate(d: Draft): Errors {
  const e: Errors = {}
  if (!d.img) e.img = 'Please upload a photo of your item.'
  if (!d.name.trim()) e.name = 'Please enter an item name.'
  else if (d.name.trim().length > 60) e.name = 'Keep the name under 60 characters.'
  const price = Number(d.price)
  if (!d.price.trim()) e.price = 'Please enter a price.'
  else if (!Number.isFinite(price) || price < 1) e.price = 'Enter a price of at least S$1.'
  else if (price > 5000) e.price = 'Enter a price up to S$5,000.'
  if (d.originalPrice.trim()) {
    const o = Number(d.originalPrice)
    if (!Number.isFinite(o) || o <= 0) e.originalPrice = 'Use numbers only, e.g. 89.'
    else if (Number.isFinite(price) && o <= price) e.originalPrice = 'Should be higher than your price — or leave blank.'
  }
  return e
}

function toInput(d: Draft): ListingInput {
  return {
    img: d.img,
    name: d.name.trim(),
    price: toCents(d.price),
    category: d.category,
    condition: d.condition,
    brand: d.brand.trim() || undefined,
    size: d.size.trim() || undefined,
    material: d.material || undefined,
    originalPrice: d.originalPrice.trim() ? toCents(d.originalPrice) : undefined,
    description: d.description.trim() || undefined,
  }
}

export default function Sell() {
  const { user, myListings, listingsReady, createListing, updateListing, toast } = useStore()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const editing = myListings.find((l) => l.id === params.get('edit') && l.status !== 'sold')
  const [draft, setDraft] = useState<Draft>(() => (editing ? draftOfListing(editing) : blank))
  const [errors, setErrors] = useState<Errors>({})
  const [step, setStep] = useState<'form' | 'preview'>('form')
  const [uploading, setUploading] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }))
    const keys = Object.keys(patch) as (keyof Errors)[]
    if (keys.some((k) => errors[k])) setErrors((x) => ({ ...x, ...Object.fromEntries(keys.map((k) => [k, undefined])) }))
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return setErrors((x) => ({ ...x, img: 'That file isn’t an image — upload a JPG, PNG or WebP photo.' }))
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return setErrors((x) => ({ ...x, img: `Photo is too large — max ${MAX_UPLOAD_MB} MB.` }))
    setUploading(true)
    try {
      set({ img: await compressImage(file) })
    } catch {
      setErrors((x) => ({ ...x, img: 'We couldn’t read that photo. Try another one.' }))
    } finally {
      setUploading(false)
    }
  }

  const toPreview = (e: FormEvent) => {
    e.preventDefault()
    const errs = validate(draft)
    setErrors(errs)
    if (Object.keys(errs).length) {
      document.querySelector('.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setStep('preview')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const publish = async () => {
    const errs = validate(draft)
    if (Object.keys(errs).length) {
      setErrors(errs)
      setStep('form')
      return
    }
    setPublishing(true)
    const ok = editing ? await updateListing(editing.id, toInput(draft)) : await createListing(toInput(draft))
    setPublishing(false)
    if (!ok) return
    if (editing) {
      toast({ title: 'Listing updated', body: `${draft.name.trim()} — changes are live on RE:PLAY.`, tone: 'success' })
      nav('/account?tab=listings')
      return
    }
    toast({ title: 'Your item is now live on RE:PLAY.', body: `${draft.name.trim()} · ${sgd(toCents(draft.price), 2)} — it’s first in Discover.`, tone: 'success' })
    nav('/discover')
  }

  if (params.get('edit') && !editing && !listingsReady) return <LoadingAccount />
  if (params.get('edit') && !editing) {
    return (
      <div className="container page empty">
        This listing can’t be edited. <Link className="link" to="/account?tab=listings">Back to My Listings</Link>
      </div>
    )
  }

  // The preview is built exactly as the marketplace will build it.
  const preview = listingToProduct({
    ...toInput(draft),
    img: draft.img,
    price: toCents(draft.price) || 0,
    id: 'preview',
    sellerId: user!.id,
    sellerHandle: handleOf(user!.name),
    status: 'active',
    createdAt: new Date().toISOString(),
  })
  const v = valuate(preview)

  return (
    <div className="container page">
      <div className="row between wrap" style={{ marginBottom: 14 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => (step === 'preview' ? setStep('form') : nav(-1))}>
          <ArrowLeft size={14} /> {step === 'preview' ? 'Back to edit' : 'Back'}
        </button>
        <SimTag>
          <Truck size={11} /> Buyers pay {sgd(DELIVERY_FEE, 2)} {DELIVERY_LABEL}
        </SimTag>
      </div>
      <PageHead
        eyebrow={editing ? 'Edit listing' : 'Sell on RE:PLAY'}
        title={step === 'preview' ? 'Preview your listing' : editing ? 'Edit your listing' : 'Sell an Item'}
        subtitle={step === 'preview' ? 'This is exactly how shoppers will see it in the marketplace.' : 'Give your pre-loved clothing its next life. A photo, a name and a price is all it takes.'}
      />

      {step === 'form' ? (
        <form className="sell-grid" noValidate onSubmit={toPreview}>
          <div className="card card-pad stack gap16">
            <div className={`field ${errors.img ? 'has-error' : ''}`}>
              <label>
                Photo <span className="muted">required</span>
              </label>
              {draft.img ? (
                <div className="upload-preview">
                  <img src={draft.img} alt="Your item" />
                  <label className="btn btn-light btn-sm" style={{ cursor: 'pointer' }}>
                    <RefreshCw size={13} /> Change photo
                    <input type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
                  </label>
                </div>
              ) : (
                <label className={`upload ${errors.img ? 'has-error' : ''}`}>
                  <input type="file" accept="image/*" aria-label="Upload a photo of your item" onChange={(e) => onFile(e.target.files?.[0])} />
                  <ImagePlus size={26} color="var(--muted)" />
                  <span className="strong">{uploading ? 'Preparing photo…' : 'Upload a photo'}</span>
                  <span className="small muted">JPG, PNG or WebP · well-lit, on a plain background</span>
                </label>
              )}
              {errors.img && <span className="field-error">{errors.img}</span>}
            </div>

            <div className="sell-fields">
              <div className={`field span2 ${errors.name ? 'has-error' : ''}`}>
                <label htmlFor="sell-name">
                  Item name <span className="muted">required</span>
                </label>
                <input id="sell-name" className="input" placeholder="e.g. Levi's Denim Jacket" maxLength={80} value={draft.name} aria-invalid={!!errors.name} onChange={(e) => set({ name: e.target.value })} />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>
              <div className={`field ${errors.price ? 'has-error' : ''}`}>
                <label htmlFor="sell-price">
                  Price <span className="muted">required</span>
                </label>
                <div className="input-prefix">
                  <span>S$</span>
                  <input id="sell-price" className="input" type="number" inputMode="decimal" min={1} step="0.01" placeholder="25.00" value={draft.price} aria-invalid={!!errors.price} onChange={(e) => set({ price: e.target.value })} />
                </div>
                {errors.price && <span className="field-error">{errors.price}</span>}
              </div>
              <div className="field">
                <label htmlFor="sell-category">Category</label>
                <select id="sell-category" className="input" value={draft.category} onChange={(e) => set({ category: e.target.value as Category })}>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="sell-condition">Condition</label>
                <select id="sell-condition" className="input" value={draft.condition} onChange={(e) => set({ condition: e.target.value as ConditionId })}>
                  {CONDITIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label.replace('Pre-owned — ', '').replace(/^./, (m) => m.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="sell-size">
                  Size <span className="muted">optional</span>
                </label>
                <input id="sell-size" className="input" placeholder="e.g. M, 32/32, US 9" maxLength={20} value={draft.size} onChange={(e) => set({ size: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="sell-brand">
                  Brand <span className="muted">optional</span>
                </label>
                <input id="sell-brand" className="input" placeholder="e.g. Levi's" maxLength={30} value={draft.brand} onChange={(e) => set({ brand: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="sell-material">
                  Material <span className="muted">optional</span>
                </label>
                <select id="sell-material" className="input" value={draft.material} onChange={(e) => set({ material: e.target.value as Material | '' })}>
                  <option value="">Not sure</option>
                  {MATERIAL_OPTIONS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={`field span2 ${errors.originalPrice ? 'has-error' : ''}`}>
                <label htmlFor="sell-original">
                  Original retail price <span className="muted">optional</span>
                </label>
                <div className="input-prefix">
                  <span>S$</span>
                  <input
                    id="sell-original"
                    className="input"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    step="0.01"
                    placeholder={Number(draft.price) >= 1 ? `Leave blank to estimate (≈ ${sgd(estimateOriginal(Number(draft.price)))})` : 'Leave blank and we’ll estimate it'}
                    value={draft.originalPrice}
                    aria-invalid={!!errors.originalPrice}
                    onChange={(e) => set({ originalPrice: e.target.value })}
                  />
                </div>
                {errors.originalPrice && <span className="field-error">{errors.originalPrice}</span>}
              </div>
              <div className="field span2">
                <label htmlFor="sell-desc">
                  Description <span className="muted">optional</span>
                </label>
                <textarea id="sell-desc" className="input" maxLength={400} placeholder="Fit, flaws, how often it was worn…" value={draft.description} onChange={(e) => set({ description: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="sell-side stack gap12">
            <div className="card card-pad stack gap12">
              <div className="card-title">Ready to sell?</div>
              <div className="small muted">Preview your listing as shoppers will see it before it goes live.</div>
              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={uploading}>
                Preview listing
              </button>
              <div className="tiny muted">Sold as {handleOf(user!.name)}. Buyers pay {sgd(DELIVERY_FEE, 2)} {DELIVERY_LABEL}. Your email and measurements are never shown.</div>
            </div>
          </div>
        </form>
      ) : (
        <div className="preview-stage fade-in">
          <ProductCard p={preview} />
          <div className="card card-pad stack gap16">
            <div>
              <div className="card-title">{draft.name.trim()}</div>
              <div className="small muted mt8">
                {preview.brand} · {preview.conditionLabel}
                {preview.size ? ` · Size ${preview.size}` : ''} · Sold by {preview.seller}
              </div>
            </div>
            {preview.description && <p className="small">{preview.description}</p>}
            <div className="row small" style={{ gap: 8 }}>
              <Sparkles size={14} color="var(--accent)" /> Buyers see an AI estimate of up to <b>{sgd(v.transformationValue)}</b> if they transform it.
            </div>
            {!draft.originalPrice.trim() && <div className="tiny muted">Original price estimated at {sgd(preview.originalPrice)} — add the real one in Edit if you know it.</div>}
            <div className="row wrap" style={{ gap: 10 }}>
              <button className="btn btn-accent btn-lg" onClick={publish} disabled={publishing}>
                <Check size={16} /> {publishing ? 'Publishing…' : editing ? 'Save changes' : 'List Item'}
              </button>
              <button className="btn btn-outline btn-lg" onClick={() => setStep('form')}>
                Edit details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

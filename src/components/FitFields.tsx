import { MEASURE_LABEL, MODEL_TYPES, SIZES, type FitDraft, type FitProfile, type Measure, type Size } from '../lib/fit'

export const MEASURES: Measure[] = ['height', 'bust', 'waist', 'hips']
const PLACEHOLDER: Record<Measure, string> = { height: 'e.g. 165', bust: 'e.g. 88', waist: 'e.g. 70', hips: 'e.g. 96' }

export type FitErrors = Partial<Record<Measure, string>>

/** Model type, height, bust, waist, hips and optional size — the one body-measurement form used across RE:PLAY. */
export default function FitFields({ idPrefix, draft, errors, onChange, clearError }: { idPrefix: string; draft: FitDraft; errors: FitErrors; onChange: (patch: Partial<FitDraft>) => void; clearError: (k: Measure) => void }) {
  return (
    <>
      <div className="field">
        <label>Gender / model type</label>
        <div className="chips" role="radiogroup" aria-label="Gender / model type">
          {MODEL_TYPES.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={draft.model === m.id} className={`chip ${draft.model === m.id ? 'on' : ''}`} onClick={() => onChange({ model: m.id })}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fit-fields">
        {MEASURES.map((k) => (
          <div key={k} className={`field ${errors[k] ? 'has-error' : ''}`}>
            <label htmlFor={`${idPrefix}-${k}`}>
              {MEASURE_LABEL[k]} <span className="muted">cm</span>
            </label>
            <input
              id={`${idPrefix}-${k}`}
              className="input"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.5"
              placeholder={PLACEHOLDER[k]}
              value={draft[k]}
              aria-invalid={!!errors[k]}
              aria-describedby={errors[k] ? `${idPrefix}-${k}-err` : undefined}
              onChange={(e) => {
                onChange({ [k]: e.target.value } as Partial<FitDraft>)
                if (errors[k]) clearError(k)
              }}
            />
            {errors[k] && (
              <span id={`${idPrefix}-${k}-err`} className="field-error">
                {errors[k]}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-size`}>
          Usual clothing size <span className="muted">optional</span>
        </label>
        <select id={`${idPrefix}-size`} className="input" value={draft.size} onChange={(e) => onChange({ size: e.target.value as Size | '' })}>
          <option value="">Not sure — estimate it for me</option>
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}

/** Compact read-only summary of a saved profile. */
export function FitSummary({ profile }: { profile: FitProfile }) {
  const rows: [string, string][] = [
    ['Model', MODEL_TYPES.find((m) => m.id === profile.model)?.label ?? profile.model],
    ['Height', `${profile.height} cm`],
    ['Bust / chest', `${profile.bust} cm`],
    ['Waist', `${profile.waist} cm`],
    ['Hips', `${profile.hips} cm`],
    ['Size', profile.size ?? 'Not set'],
  ]
  return (
    <div className="fit-summary">
      {rows.map(([l, v]) => (
        <div key={l}>
          <div className="l">{l}</div>
          <div className="v">{v}</div>
        </div>
      ))}
    </div>
  )
}

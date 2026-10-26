import { useState } from 'react'
import { draftOf, validateFit, type FitDraft } from '../../lib/fit'
import { useStore } from '../../store/store'
import FitFields, { type FitErrors } from './FitFields'
import { Modal } from '../common/ui'

/** Optional popup after sign-in: save body measurements, skip for now, or never be reminded again. */
export default function FitReminder() {
  const { fitPrompt, dismissFitPrompt, setFitProfile, setFitReminderOff, toast } = useStore()
  const [draft, setDraft] = useState<FitDraft>(() => draftOf(null))
  const [errors, setErrors] = useState<FitErrors>({})

  const close = () => {
    dismissFitPrompt()
    setDraft(draftOf(null))
    setErrors({})
  }

  const save = () => {
    const res = validateFit(draft)
    setErrors(res.errors)
    if (!res.profile) return
    setFitProfile(res.profile)
    toast({ title: 'Measurements saved', body: 'Fit previews will use them automatically. Edit any time in Account → Body Measurements.', tone: 'success' })
    close()
  }

  return (
    <Modal open={fitPrompt} onClose={close} title="Personalise your RE:PLAY experience">
      <form
        className="stack gap16"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <p className="small muted">
          Add your body measurements so RE:PLAY can personalise transformation and fit previews for you. You can skip this and add them later.
        </p>
        <FitFields idPrefix="remind" draft={draft} errors={errors} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} clearError={(k) => setErrors((x) => ({ ...x, [k]: undefined }))} />
        <p className="tiny muted">Private to your account — never shown on listings or to other shoppers.</p>
        <div className="row wrap" style={{ gap: 10 }}>
          <button type="submit" className="btn btn-accent">
            Save Measurements
          </button>
          <button type="button" className="btn btn-outline" onClick={close}>
            Skip for Now
          </button>
          <button
            type="button"
            className="link-btn"
            style={{ marginLeft: 'auto' }}
            onClick={() => {
              setFitReminderOff(true)
              toast({ title: 'We won’t remind you again', body: 'Add measurements any time in Account → Body Measurements.', tone: 'info' })
              close()
            }}
          >
            Don’t remind me again
          </button>
        </div>
      </form>
    </Modal>
  )
}

import { sgd } from '../../lib/format'
import type { Difficulty } from '../../lib/ideas'

export const DIFF_CLASS: Record<Difficulty, string> = { Easy: 'easy', Medium: 'medium', Advanced: 'advanced' }

/** Signed money, e.g. "+S$22" or "−S$4". */
export const money = (n: number) => (n < 0 ? `−${sgd(Math.abs(n))}` : `+${sgd(n)}`)
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
export const conditionWord = (label: string) => label.replace(/^Pre-(owned|loved) — /, '')

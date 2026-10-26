/** Formats Singapore dollars, e.g. S$17.99. */
export const sgd = (n: number, dp?: number) => {
  const d = dp ?? (Number.isInteger(n) ? 0 : 2)
  const s = Math.abs(n).toLocaleString('en-SG', { minimumFractionDigits: d, maximumFractionDigits: d })
  return `${n < 0 ? '−' : ''}S$${s}`
}

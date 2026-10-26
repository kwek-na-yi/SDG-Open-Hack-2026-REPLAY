/** Order maths shared by checkout, the bag and transformation ledgers. */

/** Flat Singapore Local Delivery fee — charged once per order, never per item. */
export const DELIVERY_FEE = 2.99
export const DELIVERY_LABEL = 'Singapore Local Delivery'

const cents = (n: number) => Math.round(n * 100) / 100

/** Order maths: subtotal of item prices + one S$2.99 delivery fee for the whole order. */
export function orderTotals(prices: number[]) {
  const subtotal = cents(prices.reduce((s, p) => s + p, 0))
  const delivery = prices.length ? DELIVERY_FEE : 0
  return { subtotal, delivery, total: cents(subtotal + delivery) }
}

/** Splits the single order delivery fee across its items (to the cent) so each item's cost basis adds up to what was paid. */
export function splitDelivery(count: number): number[] {
  if (count <= 0) return []
  const total = Math.round(DELIVERY_FEE * 100)
  const each = Math.floor(total / count)
  return Array.from({ length: count }, (_, i) => (each + (i < total - each * count ? 1 : 0)) / 100)
}

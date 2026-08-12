/**
 * Discount / tax arithmetic — pure, dependency-free (unit-tested in `test/`).
 */

export interface DiscountStep {
  percent: number
  priceBefore: number
  priceAfter: number
  savings: number
}

export interface DiscountStackResult {
  steps: DiscountStep[]
  finalPrice: number
  totalSavings: number
  effectiveDiscountPercent: number
}

/**
 * Applies a list of discount percentages sequentially, each on the
 * already-discounted price rather than the original — stacked discounts
 * multiply, they don't add (20% then 10% off is 28% off total, not 30%).
 */
export function applyDiscountStack(
  originalPrice: number,
  discountPercents: number[],
): DiscountStackResult {
  const steps: DiscountStep[] = []
  let price = originalPrice

  for (const rawPercent of discountPercents) {
    const percent = Math.min(100, Math.max(0, rawPercent))
    const priceBefore = price
    const priceAfter = priceBefore * (1 - percent / 100)
    steps.push({ percent, priceBefore, priceAfter, savings: priceBefore - priceAfter })
    price = priceAfter
  }

  const finalPrice = price
  const totalSavings = originalPrice - finalPrice
  const effectiveDiscountPercent = originalPrice === 0 ? 0 : (totalSavings / originalPrice) * 100

  return { steps, finalPrice, totalSavings, effectiveDiscountPercent }
}

export interface TaxInput {
  amount: number
  taxRatePercent: number
  direction: 'add' | 'remove'
}

export interface TaxResult {
  preTaxAmount: number
  taxAmount: number
  totalAmount: number
}

/**
 * `direction: 'add'` treats `amount` as the pre-tax figure and computes tax
 * on top. `direction: 'remove'` treats `amount` as already tax-inclusive and
 * backs out the pre-tax figure by dividing by `1 + rate`, not by naively
 * subtracting a tax computed on the inclusive amount.
 */
export function calculateTax(input: TaxInput): TaxResult {
  const rate = Math.max(0, input.taxRatePercent) / 100

  if (input.direction === 'add') {
    const preTaxAmount = input.amount
    const taxAmount = preTaxAmount * rate
    return { preTaxAmount, taxAmount, totalAmount: preTaxAmount + taxAmount }
  }

  const totalAmount = input.amount
  const preTaxAmount = totalAmount / (1 + rate)
  const taxAmount = totalAmount - preTaxAmount
  return { preTaxAmount, taxAmount, totalAmount }
}

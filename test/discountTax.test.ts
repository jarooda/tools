import { describe, it, expect } from 'vitest'
import { applyDiscountStack, calculateTax } from '@/utils/discountTax'

describe('applyDiscountStack', () => {
  it('returns the original price unchanged with no discounts', () => {
    const result = applyDiscountStack(100, [])
    expect(result.steps).toEqual([])
    expect(result.finalPrice).toBe(100)
    expect(result.totalSavings).toBe(0)
    expect(result.effectiveDiscountPercent).toBe(0)
  })

  it('applies a single discount', () => {
    const result = applyDiscountStack(100, [20])
    expect(result.finalPrice).toBe(80)
    expect(result.totalSavings).toBe(20)
    expect(result.effectiveDiscountPercent).toBe(20)
    expect(result.steps).toEqual([{ percent: 20, priceBefore: 100, priceAfter: 80, savings: 20 }])
  })

  it('stacks discounts multiplicatively, not additively', () => {
    const result = applyDiscountStack(100, [20, 10])
    expect(result.steps[0]).toEqual({ percent: 20, priceBefore: 100, priceAfter: 80, savings: 20 })
    expect(result.steps[1]).toEqual({ percent: 10, priceBefore: 80, priceAfter: 72, savings: 8 })
    expect(result.finalPrice).toBeCloseTo(72, 8)
    expect(result.totalSavings).toBeCloseTo(28, 8)
    expect(result.effectiveDiscountPercent).toBeCloseTo(28, 8)
  })

  it('handles three stacked discounts', () => {
    const result = applyDiscountStack(200, [10, 10, 10])
    expect(result.finalPrice).toBeCloseTo(200 * 0.9 * 0.9 * 0.9, 8)
    expect(result.steps).toHaveLength(3)
  })

  it('treats a 100% discount as a valid, non-error result', () => {
    const result = applyDiscountStack(50, [100])
    expect(result.finalPrice).toBe(0)
    expect(result.totalSavings).toBe(50)
    expect(result.effectiveDiscountPercent).toBe(100)
  })

  it('a 100% discount zeroes out any subsequent discount step', () => {
    const result = applyDiscountStack(50, [100, 50])
    expect(result.steps[1]).toEqual({ percent: 50, priceBefore: 0, priceAfter: 0, savings: 0 })
    expect(result.finalPrice).toBe(0)
  })

  it('clamps a negative discount percent to 0', () => {
    const result = applyDiscountStack(100, [-10])
    expect(result.steps[0].percent).toBe(0)
    expect(result.finalPrice).toBe(100)
  })

  it('clamps a discount percent above 100 to 100', () => {
    const result = applyDiscountStack(100, [150])
    expect(result.steps[0].percent).toBe(100)
    expect(result.finalPrice).toBe(0)
  })

  it('does not divide by zero when the original price is 0', () => {
    const result = applyDiscountStack(0, [20])
    expect(result.finalPrice).toBe(0)
    expect(result.totalSavings).toBe(0)
    expect(result.effectiveDiscountPercent).toBe(0)
  })

  it('treats a 0% discount as a no-op step', () => {
    const result = applyDiscountStack(100, [0])
    expect(result.steps[0]).toEqual({ percent: 0, priceBefore: 100, priceAfter: 100, savings: 0 })
    expect(result.finalPrice).toBe(100)
  })
})

describe('calculateTax', () => {
  it('adds tax on top of a pre-tax amount', () => {
    const result = calculateTax({ amount: 100, taxRatePercent: 8, direction: 'add' })
    expect(result.preTaxAmount).toBe(100)
    expect(result.taxAmount).toBeCloseTo(8, 8)
    expect(result.totalAmount).toBeCloseTo(108, 8)
  })

  it('backs out the pre-tax amount from a tax-inclusive total', () => {
    const result = calculateTax({ amount: 108, taxRatePercent: 8, direction: 'remove' })
    expect(result.preTaxAmount).toBeCloseTo(100, 8)
    expect(result.taxAmount).toBeCloseTo(8, 8)
    expect(result.totalAmount).toBe(108)
  })

  it('does not naively subtract a percent of the inclusive total when removing tax', () => {
    const result = calculateTax({ amount: 100, taxRatePercent: 25, direction: 'remove' })
    // Naive (wrong) approach: 100 - 25% of 100 = 75. Correct: 100 / 1.25 = 80.
    expect(result.preTaxAmount).toBeCloseTo(80, 8)
    expect(result.preTaxAmount).not.toBeCloseTo(75, 8)
    expect(result.taxAmount).toBeCloseTo(20, 8)
  })

  it('round-trips add then remove back to the same pre-tax amount', () => {
    const added = calculateTax({ amount: 63.42, taxRatePercent: 13.5, direction: 'add' })
    const removed = calculateTax({
      amount: added.totalAmount,
      taxRatePercent: 13.5,
      direction: 'remove',
    })
    expect(removed.preTaxAmount).toBeCloseTo(63.42, 8)
  })

  it('treats a 0% tax rate as a no-op in both directions', () => {
    const add = calculateTax({ amount: 100, taxRatePercent: 0, direction: 'add' })
    expect(add.taxAmount).toBe(0)
    expect(add.totalAmount).toBe(100)

    const remove = calculateTax({ amount: 100, taxRatePercent: 0, direction: 'remove' })
    expect(remove.preTaxAmount).toBe(100)
    expect(remove.taxAmount).toBe(0)
  })

  it('handles a 0 amount', () => {
    const add = calculateTax({ amount: 0, taxRatePercent: 20, direction: 'add' })
    expect(add).toEqual({ preTaxAmount: 0, taxAmount: 0, totalAmount: 0 })

    const remove = calculateTax({ amount: 0, taxRatePercent: 20, direction: 'remove' })
    expect(remove).toEqual({ preTaxAmount: 0, taxAmount: 0, totalAmount: 0 })
  })

  it('clamps a negative tax rate to 0', () => {
    const result = calculateTax({ amount: 100, taxRatePercent: -5, direction: 'add' })
    expect(result.taxAmount).toBe(0)
    expect(result.totalAmount).toBe(100)
  })
})

import { describe, it, expect } from 'vitest'
import { calculateTipSplit } from '@/utils/tip'

describe('calculateTipSplit', () => {
  it('computes a standard split', () => {
    const result = calculateTipSplit({ billAmount: 100, tipPercent: 20, peopleCount: 4 })
    expect(result.tipAmount).toBe(20)
    expect(result.totalAmount).toBe(120)
    expect(result.perPerson).toBe(30)
    expect(result.roundingDelta).toBe(0)
  })

  it('allows a 0% tip', () => {
    const result = calculateTipSplit({ billAmount: 50, tipPercent: 0, peopleCount: 2 })
    expect(result.tipAmount).toBe(0)
    expect(result.totalAmount).toBe(50)
    expect(result.perPerson).toBe(25)
  })

  it('leaves the per-person share unrounded when roundUp is off', () => {
    const result = calculateTipSplit({
      billAmount: 100,
      tipPercent: 15,
      peopleCount: 3,
      roundUp: false,
    })
    expect(result.perPerson).toBeCloseTo(38.333333, 5)
    expect(result.roundingDelta).toBe(0)
  })

  it('rounds each share up to the nearest cent when roundUp is on', () => {
    const result = calculateTipSplit({
      billAmount: 100,
      tipPercent: 15,
      peopleCount: 3,
      roundUp: true,
    })
    expect(result.perPerson).toBe(38.34)
    expect(result.roundingDelta).toBeCloseTo(0.02, 5)
  })

  it('computes rounding delta correctly for an exact split', () => {
    const result = calculateTipSplit({
      billAmount: 100,
      tipPercent: 20,
      peopleCount: 4,
      roundUp: true,
    })
    expect(result.perPerson).toBe(30)
    expect(result.roundingDelta).toBe(0)
  })

  it('handles a single person', () => {
    const result = calculateTipSplit({ billAmount: 42.5, tipPercent: 18, peopleCount: 1 })
    expect(result.tipAmount).toBeCloseTo(7.65, 5)
    expect(result.totalAmount).toBeCloseTo(50.15, 5)
    expect(result.perPerson).toBeCloseTo(50.15, 5)
    expect(result.roundingDelta).toBe(0)
  })
})

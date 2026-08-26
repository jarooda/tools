import { describe, it, expect } from 'vitest'
import { percentOf, whatPercent, percentChange, adjustByPercent } from '@/utils/percentage'

describe('percentOf', () => {
  it('computes X% of Y', () => {
    expect(percentOf(20, 150)).toBe(30)
    expect(percentOf(50, 10)).toBe(5)
  })

  it('handles negative values', () => {
    expect(percentOf(20, -150)).toBe(-30)
    expect(percentOf(-20, 150)).toBe(-30)
  })

  it('handles large numbers', () => {
    expect(percentOf(15, 1_000_000_000)).toBe(150_000_000)
  })
})

describe('whatPercent', () => {
  it('computes what percent part is of whole', () => {
    expect(whatPercent(30, 150)).toBe(20)
    expect(whatPercent(5, 10)).toBe(50)
  })

  it('returns null when whole is zero', () => {
    expect(whatPercent(5, 0)).toBeNull()
  })

  it('allows negative parts/wholes', () => {
    expect(whatPercent(-30, 150)).toBe(-20)
    expect(whatPercent(30, -150)).toBe(-20)
  })

  it('handles large numbers', () => {
    expect(whatPercent(250_000_000, 1_000_000_000)).toBe(25)
  })
})

describe('percentChange', () => {
  it('computes percent and absolute change for an increase', () => {
    expect(percentChange(100, 125)).toEqual({ pct: 25, abs: 25 })
  })

  it('computes percent and absolute change for a decrease', () => {
    expect(percentChange(200, 150)).toEqual({ pct: -25, abs: -50 })
  })

  it('returns null when from is zero', () => {
    expect(percentChange(0, 50)).toBeNull()
  })

  it('handles negative from values', () => {
    expect(percentChange(-100, -50)).toEqual({ pct: -50, abs: 50 })
  })

  it('handles large numbers', () => {
    expect(percentChange(1_000_000_000, 1_100_000_000)).toEqual({ pct: 10, abs: 100_000_000 })
  })
})

describe('adjustByPercent', () => {
  it('increases a value by percent', () => {
    expect(adjustByPercent(200, 10, 'increase')).toEqual({ result: 220, deltaAmount: 20 })
  })

  it('decreases a value by percent', () => {
    expect(adjustByPercent(200, 10, 'decrease')).toEqual({ result: 180, deltaAmount: -20 })
  })

  it('handles a negative starting value', () => {
    expect(adjustByPercent(-200, 10, 'increase')).toEqual({ result: -220, deltaAmount: -20 })
  })

  it('handles large numbers', () => {
    expect(adjustByPercent(1_000_000_000, 5, 'increase')).toEqual({
      result: 1_050_000_000,
      deltaAmount: 50_000_000,
    })
  })
})

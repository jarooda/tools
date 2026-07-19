import { describe, it, expect } from 'vitest'
import { convertLinear, convertLinearAll, type LinearUnit } from '@/utils/linear'

const approx = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps

// A tiny fixture set (base unit "b", factor 1).
const UNITS: LinearUnit<'a' | 'b' | 'c'>[] = [
  { unit: 'a', name: 'Deci', symbol: 'a', factor: 0.1 },
  { unit: 'b', name: 'Base', symbol: 'b', factor: 1 },
  { unit: 'c', name: 'Deca', symbol: 'c', factor: 10 },
]

describe('convertLinear', () => {
  it('returns the same value for identical units', () => {
    expect(convertLinear(42, 'b', 'b', UNITS)).toBe(42)
  })

  it('scales by the ratio of factors', () => {
    expect(convertLinear(1, 'c', 'b', UNITS)).toBe(10)
    expect(convertLinear(1, 'b', 'a', UNITS)).toBe(10)
    expect(convertLinear(1, 'c', 'a', UNITS)).toBe(100)
    expect(convertLinear(5, 'a', 'c', UNITS)).toBe(0.05)
  })

  it('round-trips through every unit pair', () => {
    for (const from of UNITS) {
      for (const to of UNITS) {
        const there = convertLinear(7.5, from.unit, to.unit, UNITS)
        const back = convertLinear(there, to.unit, from.unit, UNITS)
        expect(approx(back, 7.5)).toBe(true)
      }
    }
  })
})

describe('convertLinearAll', () => {
  it('produces every unit in order with correct values', () => {
    const all = convertLinearAll(1, 'b', UNITS)
    expect(all.map((r) => r.unit)).toEqual(['a', 'b', 'c'])
    expect(all.find((r) => r.unit === 'a')!.value).toBe(10)
    expect(all.find((r) => r.unit === 'c')!.value).toBe(0.1)
  })
})

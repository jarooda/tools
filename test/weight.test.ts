import { describe, it, expect } from 'vitest'
import { convertWeight, convertToAll, WEIGHT_UNITS } from '@/utils/weight'

const approx = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

describe('convertWeight', () => {
  it('returns the same value for identical units', () => {
    expect(convertWeight(42, 'kg', 'kg')).toBe(42)
  })

  it('converts within the metric system', () => {
    expect(convertWeight(1, 'kg', 'g')).toBe(1000)
    expect(convertWeight(1, 'g', 'mg')).toBe(1000)
    expect(convertWeight(1, 't', 'kg')).toBe(1000)
  })

  it('converts across systems at known anchors', () => {
    expect(approx(convertWeight(1, 'lb', 'g'), 453.59237)).toBe(true)
    expect(approx(convertWeight(16, 'oz', 'lb'), 1)).toBe(true)
    expect(approx(convertWeight(1, 'st', 'lb'), 14)).toBe(true)
    expect(approx(convertWeight(1, 'kg', 'lb'), 2.2046226218)).toBe(true)
  })

  it('round-trips through every unit pair', () => {
    for (const from of WEIGHT_UNITS) {
      for (const to of WEIGHT_UNITS) {
        const there = convertWeight(3.25, from.unit, to.unit)
        const back = convertWeight(there, to.unit, from.unit)
        expect(approx(back, 3.25, 1e-9)).toBe(true)
      }
    }
  })
})

describe('convertToAll', () => {
  it('produces every unit in registry order', () => {
    const all = convertToAll(1, 'kg')
    expect(all.map((r) => r.unit)).toEqual(WEIGHT_UNITS.map((u) => u.unit))
    expect(all.find((r) => r.unit === 'g')!.value).toBe(1000)
  })
})

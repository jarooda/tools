import { describe, it, expect } from 'vitest'
import { convertLength, convertToAll, LENGTH_UNITS } from '@/utils/length'

const approx = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps

describe('convertLength', () => {
  it('returns the same value for identical units', () => {
    expect(convertLength(42, 'm', 'm')).toBe(42)
    expect(convertLength(-3.5, 'mi', 'mi')).toBe(-3.5)
  })

  it('converts within the metric system', () => {
    expect(convertLength(1, 'km', 'm')).toBe(1000)
    expect(convertLength(1, 'm', 'cm')).toBe(100)
    expect(convertLength(1, 'm', 'mm')).toBe(1000)
    expect(convertLength(2500, 'mm', 'm')).toBe(2.5)
  })

  it('converts within the imperial system', () => {
    expect(approx(convertLength(1, 'ft', 'in'), 12)).toBe(true)
    expect(approx(convertLength(1, 'yd', 'ft'), 3)).toBe(true)
    expect(approx(convertLength(1, 'mi', 'ft'), 5280)).toBe(true)
  })

  it('converts across systems at known anchors', () => {
    expect(approx(convertLength(1, 'in', 'cm'), 2.54)).toBe(true)
    expect(approx(convertLength(1, 'ft', 'm'), 0.3048)).toBe(true)
    expect(approx(convertLength(1, 'mi', 'km'), 1.609344)).toBe(true)
    expect(approx(convertLength(1, 'nmi', 'm'), 1852)).toBe(true)
  })

  it('round-trips through every unit pair', () => {
    for (const from of LENGTH_UNITS) {
      for (const to of LENGTH_UNITS) {
        const there = convertLength(12.75, from.unit, to.unit)
        const back = convertLength(there, to.unit, from.unit)
        expect(approx(back, 12.75)).toBe(true)
      }
    }
  })
})

describe('convertToAll', () => {
  it('produces every unit in registry order', () => {
    const all = convertToAll(1, 'm')
    expect(all.map((r) => r.unit)).toEqual(LENGTH_UNITS.map((u) => u.unit))
  })

  it('computes each target value correctly', () => {
    const all = convertToAll(1, 'km')
    expect(all.find((r) => r.unit === 'm')!.value).toBe(1000)
    expect(approx(all.find((r) => r.unit === 'mi')!.value, 0.621371192237334)).toBe(true)
  })
})

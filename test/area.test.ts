import { describe, it, expect } from 'vitest'
import { convertArea, convertAreaToAll, AREA_UNITS } from '@/utils/area'

const approx = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

describe('convertArea', () => {
  it('returns the same value for identical units', () => {
    expect(convertArea(42, 'm2', 'm2')).toBe(42)
  })

  it('converts within the metric system', () => {
    expect(convertArea(1, 'm2', 'cm2')).toBe(10_000)
    expect(convertArea(1, 'ha', 'm2')).toBe(10_000)
    expect(convertArea(1, 'km2', 'ha')).toBe(100)
  })

  it('converts imperial units at known anchors', () => {
    expect(approx(convertArea(1, 'ft2', 'in2'), 144)).toBe(true)
    expect(approx(convertArea(1, 'yd2', 'ft2'), 9)).toBe(true)
    expect(approx(convertArea(1, 'mi2', 'ac'), 640)).toBe(true)
  })

  it('converts across systems', () => {
    expect(approx(convertArea(1, 'in2', 'cm2'), 6.4516)).toBe(true)
    expect(approx(convertArea(1, 'ac', 'm2'), 4046.8564224)).toBe(true)
  })

  it('round-trips through every unit pair', () => {
    for (const from of AREA_UNITS) {
      for (const to of AREA_UNITS) {
        const there = convertArea(12.5, from.unit, to.unit)
        const back = convertArea(there, to.unit, from.unit)
        expect(approx(back, 12.5, 1e-9)).toBe(true)
      }
    }
  })
})

describe('convertAreaToAll', () => {
  it('produces every unit in registry order', () => {
    const all = convertAreaToAll(1, 'm2')
    expect(all.map((r) => r.unit)).toEqual(AREA_UNITS.map((u) => u.unit))
    expect(all.find((r) => r.unit === 'cm2')!.value).toBe(10_000)
  })
})

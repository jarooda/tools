import { describe, it, expect } from 'vitest'
import { convertVolume, convertToAll, VOLUME_UNITS } from '@/utils/volume'

const approx = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps

describe('convertVolume', () => {
  it('returns the same value for identical units', () => {
    expect(convertVolume(42, 'l', 'l')).toBe(42)
  })

  it('converts within the metric system', () => {
    expect(convertVolume(1, 'l', 'ml')).toBe(1000)
    expect(convertVolume(1, 'm3', 'l')).toBe(1000)
  })

  it('converts US cooking units at known anchors', () => {
    expect(approx(convertVolume(1, 'tbsp', 'tsp'), 3)).toBe(true)
    expect(approx(convertVolume(1, 'floz', 'tbsp'), 2)).toBe(true)
    expect(approx(convertVolume(1, 'cup', 'floz'), 8)).toBe(true)
    expect(approx(convertVolume(1, 'gal', 'qt'), 4)).toBe(true)
    expect(approx(convertVolume(1, 'qt', 'pt'), 2)).toBe(true)
  })

  it('converts across systems', () => {
    expect(approx(convertVolume(1, 'gal', 'l'), 3.785411784)).toBe(true)
  })

  it('round-trips through every unit pair', () => {
    for (const from of VOLUME_UNITS) {
      for (const to of VOLUME_UNITS) {
        const there = convertVolume(2.5, from.unit, to.unit)
        const back = convertVolume(there, to.unit, from.unit)
        expect(approx(back, 2.5)).toBe(true)
      }
    }
  })
})

describe('convertToAll', () => {
  it('produces every unit in registry order', () => {
    const all = convertToAll(1, 'l')
    expect(all.map((r) => r.unit)).toEqual(VOLUME_UNITS.map((u) => u.unit))
    expect(all.find((r) => r.unit === 'ml')!.value).toBe(1000)
  })
})

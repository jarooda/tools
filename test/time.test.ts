import { describe, it, expect } from 'vitest'
import { convertTime, convertTimeToAll, TIME_UNITS } from '@/utils/time'

const approx = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

describe('convertTime', () => {
  it('returns the same value for identical units', () => {
    expect(convertTime(42, 's', 's')).toBe(42)
  })

  it('converts common durations at known anchors', () => {
    expect(convertTime(1, 's', 'ms')).toBe(1000)
    expect(convertTime(1, 'min', 's')).toBe(60)
    expect(convertTime(1, 'h', 'min')).toBe(60)
    expect(convertTime(1, 'd', 'h')).toBe(24)
    expect(convertTime(1, 'wk', 'd')).toBe(7)
  })

  it('uses an average year of 12 months and 365.2425 days', () => {
    expect(approx(convertTime(1, 'yr', 'mo'), 12)).toBe(true)
    expect(approx(convertTime(1, 'yr', 'd'), 365.2425)).toBe(true)
  })

  it('round-trips through every unit pair', () => {
    for (const from of TIME_UNITS) {
      for (const to of TIME_UNITS) {
        const there = convertTime(9.5, from.unit, to.unit)
        const back = convertTime(there, to.unit, from.unit)
        expect(approx(back, 9.5, 1e-9)).toBe(true)
      }
    }
  })
})

describe('convertTimeToAll', () => {
  it('produces every unit in registry order', () => {
    const all = convertTimeToAll(1, 'h')
    expect(all.map((r) => r.unit)).toEqual(TIME_UNITS.map((u) => u.unit))
    expect(all.find((r) => r.unit === 'min')!.value).toBe(60)
  })
})

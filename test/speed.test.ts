import { describe, it, expect } from 'vitest'
import { convertSpeed, convertSpeedToAll, SPEED_UNITS } from '@/utils/speed'

const approx = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps

describe('convertSpeed', () => {
  it('returns the same value for identical units', () => {
    expect(convertSpeed(42, 'mps', 'mps')).toBe(42)
  })

  it('converts at known anchors', () => {
    expect(approx(convertSpeed(1, 'mps', 'kmh'), 3.6)).toBe(true)
    expect(approx(convertSpeed(60, 'mph', 'kmh'), 96.56064)).toBe(true)
    expect(approx(convertSpeed(1, 'kn', 'kmh'), 1.852)).toBe(true)
    expect(approx(convertSpeed(1, 'fps', 'mph'), 0.6818181818181818)).toBe(true)
  })

  it('round-trips through every unit pair', () => {
    for (const from of SPEED_UNITS) {
      for (const to of SPEED_UNITS) {
        const there = convertSpeed(27.7, from.unit, to.unit)
        const back = convertSpeed(there, to.unit, from.unit)
        expect(approx(back, 27.7)).toBe(true)
      }
    }
  })
})

describe('convertSpeedToAll', () => {
  it('produces every unit in registry order', () => {
    const all = convertSpeedToAll(1, 'mps')
    expect(all.map((r) => r.unit)).toEqual(SPEED_UNITS.map((u) => u.unit))
    expect(approx(all.find((r) => r.unit === 'kmh')!.value, 3.6)).toBe(true)
  })
})

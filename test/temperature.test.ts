import { describe, it, expect } from 'vitest'
import {
  convertTemperature,
  convertTemperatureToAll,
  isBelowAbsoluteZero,
  ABSOLUTE_ZERO_C,
} from '@/utils/temperature'

const approx = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps

describe('convertTemperature', () => {
  it('returns the same value for identical units', () => {
    expect(convertTemperature(42, 'c', 'c')).toBe(42)
    expect(convertTemperature(-17.3, 'k', 'k')).toBe(-17.3)
  })

  it('converts Celsius ↔ Fahrenheit at known anchors', () => {
    expect(convertTemperature(0, 'c', 'f')).toBe(32)
    expect(convertTemperature(100, 'c', 'f')).toBe(212)
    expect(convertTemperature(-40, 'c', 'f')).toBe(-40) // the crossover point
    expect(convertTemperature(32, 'f', 'c')).toBe(0)
    expect(convertTemperature(212, 'f', 'c')).toBe(100)
  })

  it('converts Celsius ↔ Kelvin', () => {
    expect(convertTemperature(0, 'c', 'k')).toBe(273.15)
    expect(convertTemperature(100, 'c', 'k')).toBe(373.15)
    expect(convertTemperature(0, 'k', 'c')).toBe(ABSOLUTE_ZERO_C)
  })

  it('converts Fahrenheit ↔ Kelvin', () => {
    expect(approx(convertTemperature(32, 'f', 'k'), 273.15)).toBe(true)
    expect(approx(convertTemperature(273.15, 'k', 'f'), 32)).toBe(true)
  })

  it('round-trips through every unit pair', () => {
    for (const from of ['c', 'f', 'k'] as const) {
      for (const to of ['c', 'f', 'k'] as const) {
        const there = convertTemperature(21.5, from, to)
        const back = convertTemperature(there, to, from)
        expect(approx(back, 21.5)).toBe(true)
      }
    }
  })
})

describe('convertTemperatureToAll', () => {
  it('produces all three units in order with correct values', () => {
    const all = convertTemperatureToAll(0, 'c')
    expect(all.map((r) => r.unit)).toEqual(['c', 'f', 'k'])
    expect(all.find((r) => r.unit === 'f')!.value).toBe(32)
    expect(all.find((r) => r.unit === 'k')!.value).toBe(273.15)
  })
})

describe('isBelowAbsoluteZero', () => {
  it('flags values colder than absolute zero', () => {
    expect(isBelowAbsoluteZero(-300, 'c')).toBe(true)
    expect(isBelowAbsoluteZero(-1, 'k')).toBe(true)
    expect(isBelowAbsoluteZero(-500, 'f')).toBe(true)
  })

  it('accepts physically valid temperatures', () => {
    expect(isBelowAbsoluteZero(ABSOLUTE_ZERO_C, 'c')).toBe(false)
    expect(isBelowAbsoluteZero(0, 'k')).toBe(false)
    expect(isBelowAbsoluteZero(20, 'c')).toBe(false)
  })
})

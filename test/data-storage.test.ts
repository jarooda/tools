import { describe, it, expect } from 'vitest'
import { convertData, convertDataToAll, DATA_UNITS } from '@/utils/data-storage'

const approx = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

describe('convertData', () => {
  it('returns the same value for identical units', () => {
    expect(convertData(42, 'MB', 'MB')).toBe(42)
  })

  it('relates bits and bytes', () => {
    expect(convertData(1, 'B', 'bit')).toBe(8)
    expect(convertData(8, 'bit', 'B')).toBe(1)
  })

  it('converts decimal SI units', () => {
    expect(convertData(1, 'KB', 'B')).toBe(1000)
    expect(convertData(1, 'GB', 'MB')).toBe(1000)
    expect(convertData(1, 'TB', 'GB')).toBe(1000)
  })

  it('converts binary IEC units', () => {
    expect(convertData(1, 'KiB', 'B')).toBe(1024)
    expect(convertData(1, 'MiB', 'KiB')).toBe(1024)
    expect(convertData(1, 'GiB', 'B')).toBe(1024 ** 3)
  })

  it('crosses the decimal/binary divide', () => {
    expect(approx(convertData(1, 'MiB', 'MB'), 1.048576)).toBe(true)
  })

  it('round-trips through every unit pair', () => {
    for (const from of DATA_UNITS) {
      for (const to of DATA_UNITS) {
        const there = convertData(3.75, from.unit, to.unit)
        const back = convertData(there, to.unit, from.unit)
        expect(approx(back, 3.75, 1e-9)).toBe(true)
      }
    }
  })
})

describe('convertDataToAll', () => {
  it('produces every unit in registry order', () => {
    const all = convertDataToAll(1, 'B')
    expect(all.map((r) => r.unit)).toEqual(DATA_UNITS.map((u) => u.unit))
    expect(all.find((r) => r.unit === 'bit')!.value).toBe(8)
  })
})

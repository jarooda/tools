import { describe, it, expect } from 'vitest'
import { toRoman, fromRoman, isValidRoman, ROMAN_MIN, ROMAN_MAX } from '@/utils/roman-numeral'

describe('toRoman', () => {
  it('converts known values', () => {
    expect(toRoman(1)).toBe('I')
    expect(toRoman(4)).toBe('IV')
    expect(toRoman(9)).toBe('IX')
    expect(toRoman(40)).toBe('XL')
    expect(toRoman(90)).toBe('XC')
    expect(toRoman(2024)).toBe('MMXXIV')
    expect(toRoman(3999)).toBe('MMMCMXCIX')
  })

  it('throws outside 1–3999 or on non-integers', () => {
    expect(() => toRoman(0)).toThrow()
    expect(() => toRoman(4000)).toThrow()
    expect(() => toRoman(-5)).toThrow()
    expect(() => toRoman(1.5)).toThrow()
  })
})

describe('fromRoman', () => {
  it('parses known values (case-insensitive)', () => {
    expect(fromRoman('I')).toBe(1)
    expect(fromRoman('iv')).toBe(4)
    expect(fromRoman('MMXXIV')).toBe(2024)
    expect(fromRoman('  mmmcmxcix ')).toBe(3999)
  })

  it('rejects malformed numerals', () => {
    expect(() => fromRoman('')).toThrow()
    expect(() => fromRoman('IIII')).toThrow()
    expect(() => fromRoman('VV')).toThrow()
    expect(() => fromRoman('IC')).toThrow()
    expect(() => fromRoman('ABC')).toThrow()
  })
})

describe('round-trip', () => {
  it('toRoman ∘ fromRoman is identity across the whole range', () => {
    for (let n = ROMAN_MIN; n <= ROMAN_MAX; n++) {
      expect(fromRoman(toRoman(n))).toBe(n)
    }
  })
})

describe('isValidRoman', () => {
  it('reflects well-formedness', () => {
    expect(isValidRoman('MCMLXXXIV')).toBe(true)
    expect(isValidRoman('mmxxiv')).toBe(true)
    expect(isValidRoman('IIII')).toBe(false)
    expect(isValidRoman('')).toBe(false)
  })
})

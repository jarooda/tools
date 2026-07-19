import { describe, it, expect } from 'vitest'
import { parseInBase, isValidInBase, toBase, convertNumberBase } from '@/utils/number-base'

describe('parseInBase', () => {
  it('parses each base', () => {
    expect(parseInBase('1010', 2)).toBe(10n)
    expect(parseInBase('17', 8)).toBe(15n)
    expect(parseInBase('255', 10)).toBe(255n)
    expect(parseInBase('ff', 16)).toBe(255n)
  })

  it('ignores whitespace, underscores, and a matching prefix', () => {
    expect(parseInBase(' 1111_1111 ', 2)).toBe(255n)
    expect(parseInBase('0xDE_AD', 16)).toBe(0xdeadn)
    expect(parseInBase('0b101', 2)).toBe(5n)
  })

  it('is case-insensitive for hex', () => {
    expect(parseInBase('AbCdEf', 16)).toBe(0xabcdefn)
  })

  it('handles very large values exactly (BigInt)', () => {
    const big = '123456789012345678901234567890'
    expect(parseInBase(big, 10)).toBe(123456789012345678901234567890n)
  })

  it('throws on empty or invalid digits', () => {
    expect(() => parseInBase('   ', 10)).toThrow()
    expect(() => parseInBase('2', 2)).toThrow()
    expect(() => parseInBase('8', 8)).toThrow()
    expect(() => parseInBase('g', 16)).toThrow()
  })
})

describe('isValidInBase', () => {
  it('reflects parse success', () => {
    expect(isValidInBase('1010', 2)).toBe(true)
    expect(isValidInBase('cafe', 16)).toBe(true)
    expect(isValidInBase('xyz', 16)).toBe(false)
    expect(isValidInBase('', 10)).toBe(false)
  })
})

describe('toBase', () => {
  it('uppercases hex output', () => {
    expect(toBase(255n, 16)).toBe('FF')
    expect(toBase(10n, 2)).toBe('1010')
    expect(toBase(0n, 8)).toBe('0')
  })
})

describe('convertNumberBase', () => {
  it('renders one value across all bases', () => {
    const r = convertNumberBase('255', 10)
    expect(r.map((x) => [x.base, x.display])).toEqual([
      [2, '11111111'],
      [8, '377'],
      [10, '255'],
      [16, 'FF'],
    ])
  })

  it('throws on invalid input', () => {
    expect(() => convertNumberBase('2', 2)).toThrow()
  })
})

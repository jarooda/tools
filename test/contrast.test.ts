import { describe, it, expect } from 'vitest'
import { relativeLuminance, contrastRatio, wcagCompliance, formatRatio } from '@/utils/contrast'

const black = { r: 0, g: 0, b: 0 }
const white = { r: 255, g: 255, b: 255 }

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance(black)).toBeCloseTo(0, 5)
    expect(relativeLuminance(white)).toBeCloseTo(1, 5)
  })
})

describe('contrastRatio', () => {
  it('is 21:1 for black on white and symmetric', () => {
    expect(contrastRatio(black, white)).toBeCloseTo(21, 2)
    expect(contrastRatio(white, black)).toBeCloseTo(21, 2)
  })

  it('is 1:1 for identical colours', () => {
    expect(contrastRatio(white, white)).toBeCloseTo(1, 5)
  })

  it('matches a known mid-grey value', () => {
    // #777777 on white ≈ 4.48:1
    expect(contrastRatio({ r: 119, g: 119, b: 119 }, white)).toBeCloseTo(4.48, 1)
  })
})

describe('wcagCompliance', () => {
  it('flags thresholds correctly', () => {
    expect(wcagCompliance(21)).toEqual({
      aaNormal: true,
      aaLarge: true,
      aaaNormal: true,
      aaaLarge: true,
    })
    expect(wcagCompliance(4.5)).toEqual({
      aaNormal: true,
      aaLarge: true,
      aaaNormal: false,
      aaaLarge: true,
    })
    expect(wcagCompliance(3)).toEqual({
      aaNormal: false,
      aaLarge: true,
      aaaNormal: false,
      aaaLarge: false,
    })
    expect(wcagCompliance(2)).toEqual({
      aaNormal: false,
      aaLarge: false,
      aaaNormal: false,
      aaaLarge: false,
    })
  })
})

describe('formatRatio', () => {
  it('formats to two decimals', () => {
    expect(formatRatio(4.5)).toBe('4.50:1')
    expect(formatRatio(21)).toBe('21.00:1')
  })
})

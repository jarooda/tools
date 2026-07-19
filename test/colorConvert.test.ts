import { describe, it, expect } from 'vitest'
import { hexToRgb, hslToRgb, hslToHex, parseColor, parseToHsl } from '@/utils/colorConvert'

describe('hexToRgb', () => {
  it('parses 6-digit and 3-digit hex, with or without #', () => {
    expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 })
    expect(hexToRgb('00ff00')).toEqual({ r: 0, g: 255, b: 0 })
    expect(hexToRgb('#03F')).toEqual({ r: 0, g: 51, b: 255 })
  })

  it('rejects invalid input', () => {
    expect(hexToRgb('#ff')).toBeNull()
    expect(hexToRgb('nope')).toBeNull()
    expect(hexToRgb('#12345g')).toBeNull()
  })
})

describe('hslToRgb', () => {
  it('converts primaries', () => {
    expect(hslToRgb(0, 100, 50)).toEqual({ r: 255, g: 0, b: 0 })
    expect(hslToRgb(120, 100, 50)).toEqual({ r: 0, g: 255, b: 0 })
    expect(hslToRgb(240, 100, 50)).toEqual({ r: 0, g: 0, b: 255 })
  })

  it('handles greys and wraps hue', () => {
    expect(hslToRgb(0, 0, 100)).toEqual({ r: 255, g: 255, b: 255 })
    expect(hslToRgb(360, 100, 50)).toEqual({ r: 255, g: 0, b: 0 })
  })

  it('round-trips through hex', () => {
    expect(hslToHex(0, 100, 50)).toBe('#FF0000')
  })
})

describe('parseColor', () => {
  it('accepts hex, rgb, and hsl notations', () => {
    expect(parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0 })
    expect(parseColor('rgb(0, 128, 255)')).toEqual({ r: 0, g: 128, b: 255 })
    expect(parseColor('rgba(255, 0, 0, 0.5)')).toEqual({ r: 255, g: 0, b: 0 })
    expect(parseColor('hsl(120, 100%, 50%)')).toEqual({ r: 0, g: 255, b: 0 })
  })

  it('returns null on garbage', () => {
    expect(parseColor('teal-ish')).toBeNull()
  })

  it('parseToHsl round-trips a primary', () => {
    expect(parseToHsl('#0000ff')).toEqual({ h: 240, s: 100, l: 50 })
  })
})

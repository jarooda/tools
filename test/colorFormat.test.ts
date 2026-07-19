import { describe, it, expect } from 'vitest'
import { rgbToHex, rgbToHsl, hslString, rgbString } from '@/utils/colorFormat'

describe('rgbToHex', () => {
  it('formats primaries and white/black', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#FF0000')
    expect(rgbToHex(0, 128, 0)).toBe('#008000')
    expect(rgbToHex(255, 255, 255)).toBe('#FFFFFF')
    expect(rgbToHex(0, 0, 0)).toBe('#000000')
  })

  it('clamps out-of-range channels', () => {
    expect(rgbToHex(300, -5, 128)).toBe('#FF0080')
  })
})

describe('rgbToHsl', () => {
  it('converts primaries', () => {
    expect(rgbToHsl(255, 0, 0)).toEqual({ h: 0, s: 100, l: 50 })
    expect(rgbToHsl(0, 255, 0)).toEqual({ h: 120, s: 100, l: 50 })
    expect(rgbToHsl(0, 0, 255)).toEqual({ h: 240, s: 100, l: 50 })
  })

  it('handles greys with zero saturation', () => {
    expect(rgbToHsl(255, 255, 255)).toEqual({ h: 0, s: 0, l: 100 })
    expect(rgbToHsl(128, 128, 128)).toMatchObject({ h: 0, s: 0 })
  })
})

describe('string formatters', () => {
  it('builds css color strings', () => {
    expect(hslString({ h: 0, s: 100, l: 50 })).toBe('hsl(0, 100%, 50%)')
    expect(rgbString({ r: 255, g: 0, b: 0 })).toBe('rgb(255, 0, 0)')
  })
})

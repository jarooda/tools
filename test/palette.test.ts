import { describe, it, expect } from 'vitest'
import { buildPalette, linearGradientCss, shadeRamp } from '@/utils/palette'

const isHex = (s: string) => /^#[0-9A-F]{6}$/.test(s)

describe('buildPalette', () => {
  it('returns the right number of swatches per scheme', () => {
    expect(buildPalette('#3366ff', 'complementary')).toHaveLength(2)
    expect(buildPalette('#3366ff', 'analogous')).toHaveLength(3)
    expect(buildPalette('#3366ff', 'triadic')).toHaveLength(3)
    expect(buildPalette('#3366ff', 'tetradic')).toHaveLength(4)
    expect(buildPalette('#3366ff', 'monochromatic')).toHaveLength(5)
    expect(buildPalette('#3366ff', 'shades')).toHaveLength(6)
  })

  it('always yields valid hex colours', () => {
    for (const c of buildPalette('#e91e63', 'triadic')) expect(isHex(c)).toBe(true)
  })

  it('complementary is 180° opposite (red → cyan)', () => {
    expect(buildPalette('#ff0000', 'complementary')).toEqual(['#FF0000', '#00FFFF'])
  })

  it('returns empty for an unparseable base', () => {
    expect(buildPalette('not-a-color', 'triadic')).toEqual([])
  })
})

describe('linearGradientCss', () => {
  it('builds a css gradient string', () => {
    expect(linearGradientCss('#fff', '#000', 45)).toBe('linear-gradient(45deg, #fff, #000)')
  })
})

describe('shadeRamp', () => {
  it('clamps steps and returns valid hex', () => {
    expect(shadeRamp('#3366ff', 1)).toHaveLength(2)
    expect(shadeRamp('#3366ff', 99)).toHaveLength(12)
    for (const c of shadeRamp('#3366ff', 5)) expect(isHex(c)).toBe(true)
  })
})

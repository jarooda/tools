import { describe, it, expect } from 'vitest'
import { boxShadowCss, gradientCss, rgbaCss } from '@/utils/cssGenerator'

describe('boxShadowCss', () => {
  it('builds a shadow value', () => {
    expect(
      boxShadowCss({ offsetX: 0, offsetY: 4, blur: 8, spread: 0, color: '#000', inset: false }),
    ).toBe('0px 4px 8px 0px #000')
  })

  it('prefixes inset', () => {
    expect(
      boxShadowCss({ offsetX: 2, offsetY: 2, blur: 5, spread: 1, color: 'red', inset: true }),
    ).toBe('inset 2px 2px 5px 1px red')
  })
})

describe('gradientCss', () => {
  const stops = [
    { color: '#fff', pos: 0 },
    { color: '#000', pos: 100 },
  ]

  it('builds a linear gradient with angle', () => {
    expect(gradientCss({ type: 'linear', angle: 45, stops })).toBe(
      'linear-gradient(45deg, #fff 0%, #000 100%)',
    )
  })

  it('builds a radial gradient', () => {
    expect(gradientCss({ type: 'radial', angle: 0, stops })).toBe(
      'radial-gradient(circle, #fff 0%, #000 100%)',
    )
  })
})

describe('rgbaCss', () => {
  it('converts hex + alpha to rgba', () => {
    expect(rgbaCss('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)')
    expect(rgbaCss('#000', 1)).toBe('rgba(0, 0, 0, 1)')
  })

  it('clamps alpha and tolerates bad hex', () => {
    expect(rgbaCss('#00ff00', 2)).toBe('rgba(0, 255, 0, 1)')
    expect(rgbaCss('nope', 0.3)).toBe('rgba(0, 0, 0, 0.3)')
  })
})

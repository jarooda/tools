import { describe, it, expect } from 'vitest'
import { watermarkPlacement, WATERMARK_POSITIONS } from '@/utils/imageWatermark'

describe('watermarkPlacement', () => {
  const W = 800
  const H = 600
  const M = 20

  it('places top-left inset by the margin, anchored top-left', () => {
    expect(watermarkPlacement(W, H, 'top-left', M)).toEqual({
      x: 20,
      y: 20,
      align: 'left',
      baseline: 'top',
    })
  })

  it('places bottom-right inset from the far edges', () => {
    expect(watermarkPlacement(W, H, 'bottom-right', M)).toEqual({
      x: 780,
      y: 580,
      align: 'right',
      baseline: 'bottom',
    })
  })

  it('centers on both axes for the center anchor', () => {
    expect(watermarkPlacement(W, H, 'center', M)).toEqual({
      x: 400,
      y: 300,
      align: 'center',
      baseline: 'middle',
    })
  })

  it('mixes axes for an edge-center anchor (bottom-center)', () => {
    expect(watermarkPlacement(W, H, 'bottom-center', M)).toEqual({
      x: 400,
      y: 580,
      align: 'center',
      baseline: 'bottom',
    })
  })

  it('exposes all nine anchors', () => {
    expect(WATERMARK_POSITIONS).toHaveLength(9)
    expect(new Set(WATERMARK_POSITIONS).size).toBe(9)
  })
})

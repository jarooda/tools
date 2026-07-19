import { describe, it, expect } from 'vitest'
import { resizeToWidth, resizeToHeight, resizeByPercent } from '@/utils/imageResize'

describe('imageResize', () => {
  it('keeps aspect ratio when width is chosen', () => {
    expect(resizeToWidth(800, 600, 400)).toEqual({ width: 400, height: 300 })
  })

  it('keeps aspect ratio when height is chosen', () => {
    expect(resizeToHeight(800, 600, 300)).toEqual({ width: 400, height: 300 })
  })

  it('scales both dimensions by percentage', () => {
    expect(resizeByPercent(800, 600, 50)).toEqual({ width: 400, height: 300 })
    expect(resizeByPercent(800, 600, 150)).toEqual({ width: 1200, height: 900 })
  })

  it('rounds to whole pixels', () => {
    expect(resizeToWidth(1000, 333, 100)).toEqual({ width: 100, height: 33 })
  })

  it('never returns a zero dimension', () => {
    expect(resizeByPercent(800, 600, 0.01)).toEqual({ width: 1, height: 1 })
  })
})

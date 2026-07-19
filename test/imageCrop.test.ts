import { describe, it, expect } from 'vitest'
import { normalizeRect, clampRect, scaleRect } from '@/utils/imageCrop'

describe('normalizeRect', () => {
  it('produces positive width/height regardless of drag direction', () => {
    expect(normalizeRect(100, 80, 20, 10)).toEqual({ x: 20, y: 10, width: 80, height: 70 })
    expect(normalizeRect(20, 10, 100, 80)).toEqual({ x: 20, y: 10, width: 80, height: 70 })
  })
})

describe('clampRect', () => {
  it('keeps a rect inside the image bounds', () => {
    expect(clampRect({ x: -10, y: -10, width: 50, height: 50 }, 100, 100)).toEqual({
      x: 0,
      y: 0,
      width: 50,
      height: 50,
    })
  })

  it('shrinks width/height that overflow the far edges', () => {
    expect(clampRect({ x: 80, y: 80, width: 50, height: 50 }, 100, 100)).toEqual({
      x: 80,
      y: 80,
      width: 20,
      height: 20,
    })
  })
})

describe('scaleRect', () => {
  it('scales display coordinates to natural pixels', () => {
    expect(scaleRect({ x: 10, y: 20, width: 30, height: 40 }, 2)).toEqual({
      x: 20,
      y: 40,
      width: 60,
      height: 80,
    })
  })
})

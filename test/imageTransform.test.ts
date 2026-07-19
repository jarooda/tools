import { describe, it, expect } from 'vitest'
import { normalizeRotation, rotateBy, rotatedDimensions } from '@/utils/imageTransform'

describe('normalizeRotation', () => {
  it('snaps to the nearest right angle within 0–270', () => {
    expect(normalizeRotation(0)).toBe(0)
    expect(normalizeRotation(90)).toBe(90)
    expect(normalizeRotation(360)).toBe(0)
    expect(normalizeRotation(-90)).toBe(270)
  })
})

describe('rotateBy', () => {
  it('wraps forward and backward', () => {
    expect(rotateBy(270, 90)).toBe(0)
    expect(rotateBy(0, -90)).toBe(270)
    expect(rotateBy(90, 180)).toBe(270)
  })
})

describe('rotatedDimensions', () => {
  it('swaps width/height at 90 and 270', () => {
    expect(rotatedDimensions(800, 600, 90)).toEqual({ width: 600, height: 800 })
    expect(rotatedDimensions(800, 600, 270)).toEqual({ width: 600, height: 800 })
  })

  it('keeps dimensions at 0 and 180', () => {
    expect(rotatedDimensions(800, 600, 0)).toEqual({ width: 800, height: 600 })
    expect(rotatedDimensions(800, 600, 180)).toEqual({ width: 800, height: 600 })
  })
})

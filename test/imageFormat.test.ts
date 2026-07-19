import { describe, it, expect } from 'vitest'
import { IMAGE_FORMATS, outputFilename, formatFromMime } from '@/utils/imageFormat'

describe('imageFormat', () => {
  it('maps each format to a mime + extension', () => {
    expect(IMAGE_FORMATS.jpeg).toMatchObject({ mime: 'image/jpeg', ext: 'jpg', lossy: true })
    expect(IMAGE_FORMATS.png.lossy).toBe(false)
  })

  it('swaps the file extension to the target format', () => {
    expect(outputFilename('photo.HEIC', 'jpeg')).toBe('photo.jpg')
    expect(outputFilename('a.b.c.png', 'webp')).toBe('a.b.c.webp')
  })

  it('falls back to a stem when there is no name', () => {
    expect(outputFilename('', 'png')).toBe('image.png')
  })

  it('detects a format from a mime type, defaulting to png', () => {
    expect(formatFromMime('image/webp')).toBe('webp')
    expect(formatFromMime('image/gif')).toBe('png')
  })
})

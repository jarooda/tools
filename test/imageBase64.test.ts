import { describe, it, expect } from 'vitest'
import { parseDataUrl, isLikelyBase64, toDataUrl, extensionForMime } from '@/utils/imageBase64'

describe('parseDataUrl', () => {
  it('splits mime and data', () => {
    expect(parseDataUrl('data:image/png;base64,AAAA')).toEqual({
      mime: 'image/png',
      base64: 'AAAA',
    })
  })

  it('rejects non-base64 or malformed input', () => {
    expect(parseDataUrl('data:image/png,AAAA')).toBeNull()
    expect(parseDataUrl('hello')).toBeNull()
  })
})

describe('isLikelyBase64', () => {
  it('accepts padded base64', () => {
    expect(isLikelyBase64('AAAA')).toBe(true)
    expect(isLikelyBase64('iVBORw0KGg==')).toBe(true)
  })

  it('rejects wrong length or bad chars', () => {
    expect(isLikelyBase64('AAA')).toBe(false)
    expect(isLikelyBase64('@@@@')).toBe(false)
    expect(isLikelyBase64('')).toBe(false)
  })
})

describe('toDataUrl', () => {
  it('passes through valid data URLs', () => {
    expect(toDataUrl('data:image/webp;base64,AAAA')).toBe('data:image/webp;base64,AAAA')
  })

  it('wraps raw base64 with the fallback mime', () => {
    expect(toDataUrl('AAAA', 'image/jpeg')).toBe('data:image/jpeg;base64,AAAA')
  })

  it('returns null for junk', () => {
    expect(toDataUrl('not base64!!')).toBeNull()
  })
})

describe('extensionForMime', () => {
  it('maps known types and defaults to png', () => {
    expect(extensionForMime('image/jpeg')).toBe('jpg')
    expect(extensionForMime('image/svg+xml')).toBe('svg')
    expect(extensionForMime('image/unknown')).toBe('png')
  })
})

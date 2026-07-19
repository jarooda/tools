import { describe, it, expect } from 'vitest'
import { encodeBase64, decodeBase64 } from '@/utils/base64Text'

describe('encodeBase64 / decodeBase64', () => {
  it('encodes ASCII text', () => {
    expect(encodeBase64('hello')).toBe('aGVsbG8=')
  })

  it('decodes back to the original', () => {
    expect(decodeBase64('aGVsbG8=')).toBe('hello')
  })

  it('round-trips UTF-8 including emoji', () => {
    const s = 'Café — 你好 😀'
    expect(decodeBase64(encodeBase64(s))).toBe(s)
  })

  it('supports URL-safe alphabet without padding', () => {
    const enc = encodeBase64('<<???>>', true)
    expect(enc).not.toMatch(/[+/=]/)
    expect(decodeBase64(enc)).toBe('<<???>>')
  })

  it('decodes URL-safe input', () => {
    const enc = encodeBase64('subjects?_d=1', true)
    expect(decodeBase64(enc)).toBe('subjects?_d=1')
  })

  it('throws on malformed Base64', () => {
    expect(() => decodeBase64('!!!!')).toThrow()
    expect(() => decodeBase64('aGVsbG8')).not.toThrow()
  })

  it('handles empty string', () => {
    expect(encodeBase64('')).toBe('')
    expect(decodeBase64('')).toBe('')
  })
})

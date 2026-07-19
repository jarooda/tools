import { describe, it, expect } from 'vitest'
import { encodeUrl, decodeUrl } from '@/utils/urlEncode'

describe('encodeUrl', () => {
  it('escapes reserved characters in component mode', () => {
    expect(encodeUrl('a b&c=d')).toBe('a%20b%26c%3Dd')
  })

  it('preserves URL structure in full mode', () => {
    expect(encodeUrl('https://x.com/a b?q=1&r=2', 'full')).toBe('https://x.com/a%20b?q=1&r=2')
  })
})

describe('decodeUrl', () => {
  it('decodes component-encoded text', () => {
    expect(decodeUrl('a%20b%26c%3Dd')).toBe('a b&c=d')
  })

  it('round-trips unicode', () => {
    const s = 'café ☕ 好'
    expect(decodeUrl(encodeUrl(s))).toBe(s)
  })

  it('throws on malformed percent-encoding', () => {
    expect(() => decodeUrl('%E0%A4%A')).toThrow()
    expect(() => decodeUrl('%zz')).toThrow()
  })
})

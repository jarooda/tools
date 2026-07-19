import { describe, it, expect } from 'vitest'
import { md5 } from '@/utils/md5'

describe('md5', () => {
  // Canonical RFC 1321 test vectors.
  it('matches the RFC 1321 test suite', () => {
    expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e')
    expect(md5('a')).toBe('0cc175b9c0f1b6a831c399e269772661')
    expect(md5('abc')).toBe('900150983cd24fb0d6963f7d28e17f72')
    expect(md5('message digest')).toBe('f96b697d7cb7938d525a2f31aaf161d0')
    expect(md5('abcdefghijklmnopqrstuvwxyz')).toBe('c3fcd3d76192e4007dfb496cca67e13b')
  })

  it('handles the long alphanumeric vector (multi-block)', () => {
    expect(md5('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789')).toBe(
      'd174ab98d277d9f5a5611c2c9f419d9f',
    )
  })

  it('hashes UTF-8 multibyte input', () => {
    expect(md5('héllo')).toBe(md5('héllo'))
    expect(md5('😀')).toHaveLength(32)
  })
})

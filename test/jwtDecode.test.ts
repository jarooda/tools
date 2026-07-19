import { describe, it, expect } from 'vitest'
import { decodeJwt, formatJwtTimestamp } from '@/utils/jwtDecode'

// Sample token from jwt.io: { alg: HS256, typ: JWT } / { sub, name, iat }.
const SAMPLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ' +
  '.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

describe('decodeJwt', () => {
  it('decodes the header and payload', () => {
    const { header, payload, signature } = decodeJwt(SAMPLE)
    expect(header).toEqual({ alg: 'HS256', typ: 'JWT' })
    expect(payload).toMatchObject({ sub: '1234567890', name: 'John Doe', iat: 1516239022 })
    expect(signature).toBe('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c')
  })

  it('strips a Bearer prefix', () => {
    expect(decodeJwt(`Bearer ${SAMPLE}`).header).toEqual({ alg: 'HS256', typ: 'JWT' })
  })

  it('throws when there are not three parts', () => {
    expect(() => decodeJwt('a.b')).toThrow()
    expect(() => decodeJwt('a..c')).toThrow()
  })

  it('throws on a segment that is not JSON', () => {
    expect(() => decodeJwt('bm90anNvbg.bm90anNvbg.sig')).toThrow()
  })
})

describe('formatJwtTimestamp', () => {
  it('formats a numeric seconds timestamp', () => {
    expect(formatJwtTimestamp(1516239022)).toBe('2018-01-18T01:30:22.000Z')
  })

  it('returns null for non-numeric input', () => {
    expect(formatJwtTimestamp('nope')).toBeNull()
  })
})

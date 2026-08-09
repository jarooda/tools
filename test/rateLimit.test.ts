import { describe, it, expect } from 'vitest'
import { checkRateLimit } from '../server/utils/rateLimit'

describe('checkRateLimit', () => {
  it('allows requests under the limit', () => {
    const key = `under-${Math.random()}`
    const now = 1000
    expect(checkRateLimit(key, { max: 3, windowMs: 1000 }, now).allowed).toBe(true)
    expect(checkRateLimit(key, { max: 3, windowMs: 1000 }, now).allowed).toBe(true)
    expect(checkRateLimit(key, { max: 3, windowMs: 1000 }, now).allowed).toBe(true)
  })

  it('blocks requests over the limit', () => {
    const key = `over-${Math.random()}`
    const now = 1000
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, { max: 3, windowMs: 1000 }, now)
    }
    const result = checkRateLimit(key, { max: 3, windowMs: 1000 }, now)
    expect(result.allowed).toBe(false)
    expect(result.retryAfterMs).toBeGreaterThan(0)
  })

  it('resets once the window has passed', () => {
    const key = `reset-${Math.random()}`
    const start = 1000
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, { max: 3, windowMs: 1000 }, start)
    }
    expect(checkRateLimit(key, { max: 3, windowMs: 1000 }, start).allowed).toBe(false)
    expect(checkRateLimit(key, { max: 3, windowMs: 1000 }, start + 1001).allowed).toBe(true)
  })
})

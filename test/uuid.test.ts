import { describe, it, expect } from 'vitest'
import { uuidV4, uuidV4Batch, isUuid, NIL_UUID } from '@/utils/uuid'

describe('uuidV4', () => {
  it('produces a valid v4 UUID', () => {
    const u = uuidV4()
    expect(isUuid(u)).toBe(true)
    // Version nibble is 4, variant nibble is 8/9/a/b.
    expect(u[14]).toBe('4')
    expect('89ab').toContain(u[19])
  })

  it('is (practically) unique across many draws', () => {
    const set = new Set(uuidV4Batch(1000))
    expect(set.size).toBe(1000)
  })
})

describe('uuidV4Batch', () => {
  it('generates the requested count', () => {
    expect(uuidV4Batch(5)).toHaveLength(5)
    expect(uuidV4Batch(0)).toHaveLength(0)
    expect(uuidV4Batch(-3)).toHaveLength(0)
  })
})

describe('isUuid', () => {
  it('accepts valid and rejects invalid', () => {
    expect(isUuid(NIL_UUID)).toBe(true)
    expect(isUuid('not-a-uuid')).toBe(false)
    expect(isUuid('12345678-1234-1234-1234-1234567890')).toBe(false)
  })
})

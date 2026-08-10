import { describe, it, expect } from 'vitest'
import { ALLOWED_PORTS, isAllowedPort } from '../server/utils/portAllowlist'

describe('isAllowedPort', () => {
  it('accepts every port in the allowlist', () => {
    for (const port of ALLOWED_PORTS) {
      expect(isAllowedPort(port)).toBe(true)
    }
  })

  it('rejects ports outside the allowlist', () => {
    expect(isAllowedPort(9999)).toBe(false)
    expect(isAllowedPort(0)).toBe(false)
    expect(isAllowedPort(8443)).toBe(false)
  })
})

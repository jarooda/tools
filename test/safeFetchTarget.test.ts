import { describe, it, expect, vi, beforeEach } from 'vitest'

const lookupMock = vi.fn()

vi.mock('node:dns', () => ({
  promises: { lookup: (...args: unknown[]) => lookupMock(...args) },
}))

const { isPrivateOrReservedIp, resolveAndValidateTarget } =
  await import('../server/utils/safeFetchTarget')

describe('isPrivateOrReservedIp', () => {
  it('flags IPv4 private ranges', () => {
    expect(isPrivateOrReservedIp('10.0.0.1')).toBe(true)
    expect(isPrivateOrReservedIp('10.255.255.255')).toBe(true)
    expect(isPrivateOrReservedIp('172.16.0.1')).toBe(true)
    expect(isPrivateOrReservedIp('172.31.255.255')).toBe(true)
    expect(isPrivateOrReservedIp('192.168.1.1')).toBe(true)
    expect(isPrivateOrReservedIp('127.0.0.1')).toBe(true)
    expect(isPrivateOrReservedIp('169.254.1.1')).toBe(true)
    expect(isPrivateOrReservedIp('0.0.0.5')).toBe(true)
  })

  it('does not flag adjacent public ranges', () => {
    expect(isPrivateOrReservedIp('172.15.255.255')).toBe(false)
    expect(isPrivateOrReservedIp('172.32.0.0')).toBe(false)
    expect(isPrivateOrReservedIp('8.8.8.8')).toBe(false)
    expect(isPrivateOrReservedIp('1.1.1.1')).toBe(false)
  })

  it('flags IPv6 private/reserved ranges', () => {
    expect(isPrivateOrReservedIp('::1')).toBe(true)
    expect(isPrivateOrReservedIp('fc00::1')).toBe(true)
    expect(isPrivateOrReservedIp('fd12:3456::1')).toBe(true)
    expect(isPrivateOrReservedIp('fe80::1')).toBe(true)
  })

  it('unwraps IPv4-mapped IPv6 addresses', () => {
    expect(isPrivateOrReservedIp('::ffff:10.0.0.1')).toBe(true)
    expect(isPrivateOrReservedIp('::ffff:8.8.8.8')).toBe(false)
  })

  it('does not flag public IPv6', () => {
    expect(isPrivateOrReservedIp('2606:4700:4700::1111')).toBe(false)
  })
})

describe('resolveAndValidateTarget — URL parsing / scheme / localhost', () => {
  it('rejects malformed input', async () => {
    const result = await resolveAndValidateTarget('http://')
    expect(result).toEqual({ ok: false, reason: 'invalid' })
  })

  it('accepts an explicit https:// prefix (protocol check passes)', async () => {
    lookupMock.mockResolvedValue([{ address: '8.8.8.8' }])
    const result = await resolveAndValidateTarget('https://example.com')
    expect(result.ok).toBe(true)
  })

  it('blocks localhost outright, without a DNS lookup', async () => {
    lookupMock.mockReset()
    const result = await resolveAndValidateTarget('localhost')
    expect(result).toEqual({ ok: false, reason: 'blocked' })
    expect(lookupMock).not.toHaveBeenCalled()
  })

  it('rejects empty input', async () => {
    const result = await resolveAndValidateTarget('   ')
    expect(result).toEqual({ ok: false, reason: 'invalid' })
  })
})

describe('resolveAndValidateTarget — DNS-dependent path', () => {
  beforeEach(() => {
    lookupMock.mockReset()
  })

  it('prepends https:// when no scheme is given', async () => {
    lookupMock.mockResolvedValue([{ address: '93.184.216.34' }])
    const result = await resolveAndValidateTarget('example.com')
    expect(result.ok).toBe(true)
    expect(result.url?.toString()).toBe('https://example.com/')
  })

  it('allows a target resolving to a public address', async () => {
    lookupMock.mockResolvedValue([{ address: '8.8.8.8' }])
    const result = await resolveAndValidateTarget('https://example.com')
    expect(result.ok).toBe(true)
    expect(result.url).toBeInstanceOf(URL)
  })

  it('blocks a target resolving to a private address', async () => {
    lookupMock.mockResolvedValue([{ address: '192.168.1.1' }])
    const result = await resolveAndValidateTarget('internal.example.com')
    expect(result).toEqual({ ok: false, reason: 'blocked' })
  })

  it('blocks if any of multiple resolved addresses is private', async () => {
    lookupMock.mockResolvedValue([{ address: '8.8.8.8' }, { address: '10.0.0.5' }])
    const result = await resolveAndValidateTarget('mixed.example.com')
    expect(result).toEqual({ ok: false, reason: 'blocked' })
  })

  it('treats a DNS lookup failure as invalid', async () => {
    lookupMock.mockRejectedValue(new Error('ENOTFOUND'))
    const result = await resolveAndValidateTarget('does-not-exist.invalid')
    expect(result).toEqual({ ok: false, reason: 'invalid' })
  })
})

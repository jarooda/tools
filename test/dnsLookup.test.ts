import { describe, it, expect, afterEach, vi } from 'vitest'
import { lookupDns } from '../app/utils/dnsLookup'

function mockFetch(body: unknown, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      json: () => Promise.resolve(body),
    }),
  )
}

describe('lookupDns', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns mapped answers on a successful lookup with multiple records', async () => {
    mockFetch({
      Status: 0,
      Answer: [
        { name: 'example.com.', type: 1, TTL: 300, data: '93.184.216.34' },
        { name: 'example.com.', type: 15, TTL: 3600, data: '10 mail.example.com.' },
      ],
    })

    const result = await lookupDns('example.com', 'A')

    expect(result.error).toBeNull()
    expect(result.answers).toEqual([
      { name: 'example.com', type: 'A', ttl: 300, data: '93.184.216.34' },
      { name: 'example.com', type: 'MX', ttl: 3600, data: '10 mail.example.com.' },
    ])
  })

  it('falls back to the raw numeric code for unmapped types', async () => {
    mockFetch({
      Status: 0,
      Answer: [{ name: 'example.com.', type: 999, TTL: 60, data: 'weird' }],
    })

    const result = await lookupDns('example.com', 'A')
    expect(result.answers[0]!.type).toBe('999')
  })

  it('returns an empty answer list with no error when Status 0 has no Answer array', async () => {
    mockFetch({ Status: 0 })

    const result = await lookupDns('example.com', 'CAA')
    expect(result).toEqual({ answers: [], error: null })
  })

  it('folds NXDOMAIN (Status 3) into empty/no-error', async () => {
    mockFetch({ Status: 3 })

    const result = await lookupDns('doesnotexist.example', 'A')
    expect(result).toEqual({ answers: [], error: null })
  })

  it('returns an error for a non-zero, non-NXDOMAIN Status', async () => {
    mockFetch({ Status: 2 })

    const result = await lookupDns('example.com', 'A')
    expect(result.answers).toEqual([])
    expect(result.error).toBeTruthy()
  })

  it('returns an error for a non-OK HTTP response', async () => {
    mockFetch({ Status: 0 }, false)

    const result = await lookupDns('example.com', 'A')
    expect(result.answers).toEqual([])
    expect(result.error).toBeTruthy()
  })

  it('returns a network error message when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const result = await lookupDns('example.com', 'A')
    expect(result.answers).toEqual([])
    expect(result.error).toBe('Network error — could not reach the DNS resolver.')
  })

  it.each([
    ['empty string', ''],
    ['whitespace', '   '],
    ['contains whitespace', 'example .com'],
    ['contains a scheme', 'https://example.com'],
  ])('rejects malformed input: %s', async (_label, input) => {
    const result = await lookupDns(input, 'A')
    expect(result).toEqual({
      answers: [],
      error: 'Enter a valid hostname, e.g. example.com',
    })
  })
})

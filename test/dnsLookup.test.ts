import { describe, it, expect, afterEach, vi } from 'vitest'
import { lookupDns } from '../app/utils/dnsLookup'

function typeFromUrl(url: string): string {
  return new URL(url).searchParams.get('type') ?? ''
}

function mockFetchByType(responses: Record<string, unknown>, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      const type = typeFromUrl(url)
      const body = type in responses ? responses[type] : { Status: 0 }
      return Promise.resolve({
        ok,
        json: () => Promise.resolve(body),
      })
    }),
  )
}

describe('lookupDns', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('merges answers from every record type queried in parallel', async () => {
    mockFetchByType({
      A: {
        Status: 0,
        Answer: [{ name: 'example.com.', type: 1, TTL: 300, data: '93.184.216.34' }],
      },
      MX: {
        Status: 0,
        Answer: [{ name: 'example.com.', type: 15, TTL: 3600, data: '10 mail.example.com.' }],
      },
    })

    const result = await lookupDns('example.com')

    expect(result.error).toBeNull()
    expect(result.answers).toEqual(
      expect.arrayContaining([
        { name: 'example.com', type: 'A', ttl: 300, data: '93.184.216.34' },
        { name: 'example.com', type: 'MX', ttl: 3600, data: '10 mail.example.com.' },
      ]),
    )
    expect(result.answers).toHaveLength(2)
  })

  it('dedupes the same CNAME answer returned by multiple type queries', async () => {
    const cnameAnswer = {
      name: 'cdn.example.com.',
      type: 5,
      TTL: 300,
      data: 'edge.cdn-provider.net.',
    }
    mockFetchByType({
      A: { Status: 0, Answer: [cnameAnswer] },
      AAAA: { Status: 0, Answer: [cnameAnswer] },
      CNAME: { Status: 0, Answer: [cnameAnswer] },
      MX: { Status: 0, Answer: [cnameAnswer] },
      TXT: { Status: 0, Answer: [cnameAnswer] },
      NS: { Status: 0, Answer: [cnameAnswer] },
      SOA: { Status: 0, Answer: [cnameAnswer] },
      CAA: { Status: 0, Answer: [cnameAnswer] },
    })

    const result = await lookupDns('cdn.example.com')

    expect(result.error).toBeNull()
    expect(result.answers).toEqual([
      { name: 'cdn.example.com', type: 'CNAME', ttl: 300, data: 'edge.cdn-provider.net.' },
    ])
  })

  it('falls back to the raw numeric code for unmapped types', async () => {
    mockFetchByType({
      A: { Status: 0, Answer: [{ name: 'example.com.', type: 999, TTL: 60, data: 'weird' }] },
    })

    const result = await lookupDns('example.com')
    const answer = result.answers.find((a) => a.data === 'weird')
    expect(answer?.type).toBe('999')
  })

  it('returns an empty answer list with no error when no type has any Answer', async () => {
    mockFetchByType({})

    const result = await lookupDns('example.com')
    expect(result).toEqual({ answers: [], error: null })
  })

  it('folds NXDOMAIN (Status 3) into empty/no-error', async () => {
    mockFetchByType({
      A: { Status: 3 },
      AAAA: { Status: 3 },
      CNAME: { Status: 3 },
      MX: { Status: 3 },
      TXT: { Status: 3 },
      NS: { Status: 3 },
      SOA: { Status: 3 },
      CAA: { Status: 3 },
    })

    const result = await lookupDns('doesnotexist.example')
    expect(result).toEqual({ answers: [], error: null })
  })

  it('omits a failing record type but keeps results from the others', async () => {
    mockFetchByType({
      A: {
        Status: 0,
        Answer: [{ name: 'example.com.', type: 1, TTL: 300, data: '93.184.216.34' }],
      },
      CAA: { Status: 2 },
    })

    const result = await lookupDns('example.com')
    expect(result.error).toBeNull()
    expect(result.answers).toEqual([
      { name: 'example.com', type: 'A', ttl: 300, data: '93.184.216.34' },
    ])
  })

  it('returns an error only when every record type fails', async () => {
    mockFetchByType({
      A: { Status: 2 },
      AAAA: { Status: 2 },
      CNAME: { Status: 2 },
      MX: { Status: 2 },
      TXT: { Status: 2 },
      NS: { Status: 2 },
      SOA: { Status: 2 },
      CAA: { Status: 2 },
    })

    const result = await lookupDns('example.com')
    expect(result.answers).toEqual([])
    expect(result.error).toBeTruthy()
  })

  it('returns an error for a non-OK HTTP response on every type', async () => {
    mockFetchByType({}, false)

    const result = await lookupDns('example.com')
    expect(result.answers).toEqual([])
    expect(result.error).toBeTruthy()
  })

  it('returns a network error message when fetch throws for every type', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const result = await lookupDns('example.com')
    expect(result.answers).toEqual([])
    expect(result.error).toBe('DNS lookup failed — try again in a moment.')
  })

  it.each([
    ['empty string', ''],
    ['whitespace', '   '],
    ['contains whitespace', 'example .com'],
    ['contains a scheme', 'https://example.com'],
  ])('rejects malformed input: %s', async (_label, input) => {
    const result = await lookupDns(input)
    expect(result).toEqual({
      answers: [],
      error: 'Enter a valid hostname, e.g. example.com',
    })
  })
})

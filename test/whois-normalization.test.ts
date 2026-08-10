import { describe, it, expect, afterEach, vi } from 'vitest'
import { useWhoisLookup } from '../app/composables/useWhoisLookup'

function mockFetch(body: unknown, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      json: () => Promise.resolve(body),
    }),
  )
}

describe('useWhoisLookup registrable-domain normalization', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('leaves a bare registrable domain unchanged', async () => {
    mockFetch({ found: false })
    const { domain, normalizedDomain, lookup } = useWhoisLookup()
    domain.value = 'example.com'
    await lookup()

    expect(normalizedDomain.value).toBeNull()
    expect(fetch).toHaveBeenCalledWith('/api/network/whois?domain=example.com', expect.anything())
  })

  it('reduces a subdomain to its registrable domain', async () => {
    mockFetch({ found: false })
    const { domain, normalizedDomain, lookup } = useWhoisLookup()
    domain.value = 'www.example.com'
    await lookup()

    expect(normalizedDomain.value).toBe('example.com')
    expect(fetch).toHaveBeenCalledWith('/api/network/whois?domain=example.com', expect.anything())
  })

  it('reduces a subdomain of a compound TLD to its PSL-aware registrable domain', async () => {
    mockFetch({ found: false })
    const { domain, normalizedDomain, lookup } = useWhoisLookup()
    domain.value = 'blog.example.co.uk'
    await lookup()

    expect(normalizedDomain.value).toBe('example.co.uk')
    expect(fetch).toHaveBeenCalledWith('/api/network/whois?domain=example.co.uk', expect.anything())
  })

  it('leaves an IP address literal alone and does not block the lookup', async () => {
    mockFetch({ found: false })
    const { domain, normalizedDomain, lookup } = useWhoisLookup()
    domain.value = '192.168.1.1'
    await lookup()

    expect(normalizedDomain.value).toBeNull()
    expect(fetch).toHaveBeenCalledWith('/api/network/whois?domain=192.168.1.1', expect.anything())
  })
})

import { extractVcardFn } from '../../utils/rdap'

/**
 * WHOIS lookup via RDAP (the modern JSON-based WHOIS replacement), proxied
 * through rdap.org's public bootstrap service. This is a fixed, trusted
 * upstream — not an arbitrary user-supplied target — so it doesn't need the
 * SSRF-guard `safeFetchTarget.ts` used for tools that fetch arbitrary hosts.
 * Successful lookups are cached per-domain in memory, same "simple
 * in-memory state" style as `server/api/fx.get.ts` and
 * `server/api/network/my-ip.get.ts`.
 */
interface RdapEntity {
  roles?: string[]
  vcardArray?: unknown
}

interface RdapNameserver {
  ldhName?: string
}

interface RdapEvent {
  eventAction?: string
  eventDate?: string
}

interface RdapResponse {
  ldhName?: string
  status?: string[]
  entities?: RdapEntity[]
  nameservers?: RdapNameserver[]
  events?: RdapEvent[]
}

interface WhoisData {
  found: true
  domain: string
  registrar: string | null
  statuses: string[]
  nameservers: string[]
  events: Array<{ action: string; date: string }>
  raw: unknown
}

interface CacheEntry {
  data: WhoisData
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()
const TTL_MS = 30 * 60 * 1000

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const rateLimit = checkRateLimit(`network:whois:${ip}`, { max: 20, windowMs: 5 * 60 * 1000 })
  if (!rateLimit.allowed) {
    setResponseStatus(event, 429)
    return { error: 'Too many lookups — wait a moment and try again.', kind: 'rate-limited' }
  }

  const query = getQuery(event)
  const domain = typeof query.domain === 'string' ? query.domain.trim() : ''

  if (!domain || domain.includes('://')) {
    setResponseStatus(event, 400)
    return { error: 'Enter a valid domain, e.g. example.com', kind: 'invalid' }
  }

  setResponseHeader(event, 'Cache-Control', 'no-store')

  const cached = cache.get(domain)
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return cached.data
  }

  let res: Response
  try {
    res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      headers: { accept: 'application/rdap+json' },
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    setResponseStatus(event, 502)
    return {
      error: 'Could not reach the WHOIS/RDAP service — try again in a moment.',
      kind: 'network',
    }
  }

  if (res.status === 404) {
    return { found: false }
  }

  if (!res.ok) {
    setResponseStatus(event, 502)
    return {
      error: 'Could not reach the WHOIS/RDAP service — try again in a moment.',
      kind: 'network',
    }
  }

  const body = (await res.json().catch(() => null)) as RdapResponse | null
  if (!body) {
    setResponseStatus(event, 502)
    return {
      error: 'Could not reach the WHOIS/RDAP service — try again in a moment.',
      kind: 'network',
    }
  }

  const registrarEntity = (body.entities ?? []).find((e) => e.roles?.includes('registrar'))
  const registrar = registrarEntity ? extractVcardFn(registrarEntity.vcardArray) : null

  const data: WhoisData = {
    found: true,
    domain: body.ldhName ?? domain,
    registrar,
    statuses: body.status ?? [],
    nameservers: (body.nameservers ?? [])
      .map((ns) => ns.ldhName)
      .filter((n): n is string => Boolean(n)),
    events: (body.events ?? []).map((e) => ({
      action: e.eventAction ?? '',
      date: e.eventDate ?? '',
    })),
    raw: body,
  }

  cache.set(domain, { data, fetchedAt: Date.now() })
  return data
})

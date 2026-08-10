export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SOA' | 'CAA'

export interface DnsAnswer {
  name: string
  type: string
  ttl: number
  data: string
}

export interface DnsLookupResult {
  answers: DnsAnswer[]
  error: string | null
}

const RECORD_TYPE_CODE: Record<number, string> = {
  1: 'A',
  28: 'AAAA',
  5: 'CNAME',
  15: 'MX',
  16: 'TXT',
  2: 'NS',
  6: 'SOA',
  257: 'CAA',
}

interface CloudflareAnswer {
  name: string
  type: number
  TTL: number
  data: string
}

interface CloudflareResponse {
  Status: number
  Answer?: CloudflareAnswer[]
}

function stripTrailingDot(name: string): string {
  return name.endsWith('.') ? name.slice(0, -1) : name
}

const ALL_RECORD_TYPES: DnsRecordType[] = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'CAA']

interface TypeLookupResult {
  answers: DnsAnswer[]
  ok: boolean
}

async function lookupType(hostname: string, type: DnsRecordType): Promise<TypeLookupResult> {
  let res: Response
  try {
    res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`,
      { headers: { accept: 'application/dns-json' } },
    )
  } catch {
    return { answers: [], ok: false }
  }

  if (!res.ok) {
    return { answers: [], ok: false }
  }

  const body = (await res.json().catch(() => null)) as CloudflareResponse | null
  if (!body || typeof body.Status !== 'number') {
    return { answers: [], ok: false }
  }

  // Status 3 (NXDOMAIN) means the hostname doesn't exist at all. We deliberately
  // fold this into the same "no records" success case as an empty Answer array —
  // a third "domain doesn't exist" state isn't worth the extra UI for v1.
  if (body.Status === 3) {
    return { answers: [], ok: true }
  }

  if (body.Status !== 0) {
    return { answers: [], ok: false }
  }

  const answers: DnsAnswer[] = (body.Answer ?? []).map((a) => ({
    name: stripTrailingDot(a.name),
    type: RECORD_TYPE_CODE[a.type] ?? String(a.type),
    ttl: a.TTL,
    data: a.data,
  }))

  return { answers, ok: true }
}

/**
 * Looks up all DNS record types for a hostname via Cloudflare's DNS-over-HTTPS
 * JSON API — a CORS-enabled endpoint, so this runs entirely client-side with
 * no first-party server involved. Queries every record type in parallel and
 * merges the results; a single flaky record type doesn't blank out the rest.
 */
export async function lookupDns(hostname: string): Promise<DnsLookupResult> {
  const trimmed = hostname.trim()

  if (!trimmed || /\s/.test(trimmed) || trimmed.includes('://')) {
    return { answers: [], error: 'Enter a valid hostname, e.g. example.com' }
  }

  const results = await Promise.all(ALL_RECORD_TYPES.map((type) => lookupType(trimmed, type)))

  if (results.every((r) => !r.ok)) {
    return { answers: [], error: 'DNS lookup failed — try again in a moment.' }
  }

  const seen = new Set<string>()
  const answers = results
    .flatMap((r) => r.answers)
    .filter((a) => {
      const key = `${a.name}|${a.type}|${a.data}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  return { answers, error: null }
}

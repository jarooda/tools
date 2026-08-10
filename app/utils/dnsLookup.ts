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

/**
 * Looks up DNS records for a hostname via Cloudflare's DNS-over-HTTPS JSON API
 * — a CORS-enabled endpoint, so this runs entirely client-side with no
 * first-party server involved.
 */
export async function lookupDns(hostname: string, type: DnsRecordType): Promise<DnsLookupResult> {
  const trimmed = hostname.trim()

  if (!trimmed || /\s/.test(trimmed) || trimmed.includes('://')) {
    return { answers: [], error: 'Enter a valid hostname, e.g. example.com' }
  }

  let res: Response
  try {
    res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(trimmed)}&type=${type}`,
      { headers: { accept: 'application/dns-json' } },
    )
  } catch {
    return { answers: [], error: 'Network error — could not reach the DNS resolver.' }
  }

  if (!res.ok) {
    return { answers: [], error: 'DNS lookup failed — try again in a moment.' }
  }

  const body = (await res.json().catch(() => null)) as CloudflareResponse | null
  if (!body || typeof body.Status !== 'number') {
    return { answers: [], error: 'DNS lookup failed — try again in a moment.' }
  }

  // Status 3 (NXDOMAIN) means the hostname doesn't exist at all. We deliberately
  // fold this into the same "no records" success case as an empty Answer array —
  // a third "domain doesn't exist" state isn't worth the extra UI for v1.
  if (body.Status === 3) {
    return { answers: [], error: null }
  }

  if (body.Status !== 0) {
    return { answers: [], error: 'DNS lookup failed — try again in a moment.' }
  }

  const answers: DnsAnswer[] = (body.Answer ?? []).map((a) => ({
    name: stripTrailingDot(a.name),
    type: RECORD_TYPE_CODE[a.type] ?? String(a.type),
    ttl: a.TTL,
    data: a.data,
  }))

  return { answers, error: null }
}

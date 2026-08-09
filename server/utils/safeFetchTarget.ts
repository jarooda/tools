import { promises as dns } from 'node:dns'

/**
 * Shared SSRF guard for Network & Performance tools that fetch an arbitrary
 * user-supplied URL server-side (ping, and upcoming header inspector /
 * uptime checker). Resolves the hostname and rejects anything pointing at a
 * private/reserved address before the app makes an outbound request.
 *
 * This is a pre-flight guard, not a pinned-IP proxy — it validates the
 * *hostname's* current resolution, then lets the runtime's own fetch resolve
 * DNS again to actually connect. That means it doesn't fully prevent
 * DNS-rebinding attacks (an attacker's DNS could resolve differently between
 * the check and the real fetch). That tradeoff is acceptable for a
 * lightweight toolkit tool — it is not a high-security proxy.
 */

export interface TargetValidation {
  ok: boolean
  url?: URL
  reason?: 'invalid' | 'blocked'
}

function ipv4ToInt(parts: number[]): number {
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0
}

function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return false
  const int = ipv4ToInt(parts)
  const inRange = (base: string, bits: number) => {
    const baseParts = base.split('.').map(Number)
    const baseInt = ipv4ToInt(baseParts)
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0
    return (int & mask) === (baseInt & mask)
  }
  return (
    inRange('10.0.0.0', 8) ||
    inRange('172.16.0.0', 12) ||
    inRange('192.168.0.0', 16) ||
    inRange('127.0.0.0', 8) ||
    inRange('169.254.0.0', 16) ||
    inRange('0.0.0.0', 8)
  )
}

export function isPrivateOrReservedIp(ip: string): boolean {
  const lower = ip.toLowerCase()

  const v4mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (v4mapped) return isPrivateOrReservedIpv4(v4mapped[1]!)

  if (ip.includes('.') && !ip.includes(':')) return isPrivateOrReservedIpv4(ip)

  if (lower === '::1') return true
  if (/^f[c-d][0-9a-f]{2}:/.test(lower)) return true // fc00::/7
  if (/^fe[8-9a-b][0-9a-f]:/.test(lower)) return true // fe80::/10

  return false
}

export async function resolveAndValidateTarget(input: string): Promise<TargetValidation> {
  const trimmed = input.trim()
  if (!trimmed) return { ok: false, reason: 'invalid' }

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    return { ok: false, reason: 'invalid' }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'invalid' }
  }

  if (url.hostname.toLowerCase() === 'localhost') {
    return { ok: false, reason: 'blocked' }
  }

  let addresses: { address: string }[]
  try {
    addresses = await dns.lookup(url.hostname, { all: true })
  } catch {
    return { ok: false, reason: 'invalid' }
  }

  if (addresses.length === 0) return { ok: false, reason: 'invalid' }
  if (addresses.some((a) => isPrivateOrReservedIp(a.address))) {
    return { ok: false, reason: 'blocked' }
  }

  return { ok: true, url }
}

const MAX_REDIRECTS = 3

export async function safeFetch(url: URL, init?: RequestInit): Promise<Response> {
  let currentUrl = url
  let response: Response

  for (let redirects = 0; ; redirects++) {
    response = await fetch(currentUrl, {
      ...init,
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    })

    const isRedirect = response.status >= 300 && response.status < 400
    const location = response.headers.get('location')
    if (!isRedirect || !location || redirects >= MAX_REDIRECTS) {
      return response
    }

    let nextUrl: URL
    try {
      nextUrl = new URL(location, currentUrl)
    } catch {
      return response
    }

    const validation = await resolveAndValidateTarget(nextUrl.toString())
    if (!validation.ok || !validation.url) {
      return response
    }

    currentUrl = validation.url
  }
}

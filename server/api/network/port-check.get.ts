import { createConnection } from 'node:net'
import dns from 'node:dns/promises'

const CONNECT_TIMEOUT_MS = 3000
// Bounds worst-case parallel connections if a host resolves to an unusually
// large number of addresses — typical CDN/multi-A setups are well under this.
const MAX_ADDRESSES = 8

type PortCheckResult = 'open' | 'closed' | 'timeout'

export interface PortCheckAddressResult {
  ip: string
  result: PortCheckResult
}

function tryConnect(ip: string, port: number): Promise<PortCheckResult> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: ip, port, timeout: CONNECT_TIMEOUT_MS })
    let settled = false

    const cleanup = () => {
      socket.removeAllListeners()
      socket.destroy()
    }

    socket.on('connect', () => {
      if (settled) return
      settled = true
      cleanup()
      resolve('open')
    })

    socket.on('timeout', () => {
      if (settled) return
      settled = true
      cleanup()
      resolve('timeout')
    })

    socket.on('error', (err: NodeJS.ErrnoException) => {
      if (settled) return
      settled = true
      cleanup()
      if (err.code === 'ECONNREFUSED') {
        resolve('closed')
      } else {
        reject(err)
      }
    })
  })
}

/**
 * Attempts a raw TCP connection to a user-supplied host:port, guarded by a
 * curated port allowlist, SSRF hostname validation, and rate limiting. Only
 * confirms TCP-level reachability — never sends or receives protocol data.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const host = typeof query.host === 'string' ? query.host : ''
  const portNum = Number.parseInt(typeof query.port === 'string' ? query.port : '', 10)

  if (!Number.isInteger(portNum) || !isAllowedPort(portNum)) {
    setResponseStatus(event, 400)
    return { error: 'Port not supported — choose from the list.', kind: 'invalid' }
  }

  const hostnameValidation = await resolveAndValidateHostname(host)
  if (!hostnameValidation.ok) {
    setResponseStatus(event, 400)
    return {
      error:
        hostnameValidation.reason === 'blocked'
          ? "That address can't be checked (private or internal)."
          : "That doesn't look like a valid host.",
      kind: hostnameValidation.reason ?? 'invalid',
    }
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const rateLimit = checkRateLimit(`network:port-check:${ip}`, { max: 20, windowMs: 5 * 60 * 1000 })
  if (!rateLimit.allowed) {
    setResponseStatus(event, 429)
    return { error: 'Too many checks — wait a moment and try again.', kind: 'rate-limited' }
  }

  setResponseHeader(event, 'Cache-Control', 'no-store')

  // Resolve every address the host has (not just one) — a host behind a CDN
  // commonly has several, and the port may be open on some and not others.
  // Picking one arbitrarily and calling it "the" result would hide that.
  let addresses: string[]
  try {
    const resolved = await dns.lookup(host, { all: true })
    if (resolved.length === 0) throw new Error('no addresses')
    addresses = [...new Set(resolved.map((a) => a.address))].slice(0, MAX_ADDRESSES)
  } catch {
    setResponseStatus(event, 502)
    return {
      error: 'Could not resolve that host — it may be unreachable.',
      kind: 'network',
    }
  }

  try {
    const results: PortCheckAddressResult[] = await Promise.all(
      addresses.map(async (ip) => ({ ip, result: await tryConnect(ip, portNum) })),
    )
    return { results }
  } catch {
    setResponseStatus(event, 502)
    return {
      error: 'Could not reach that host — it may be unreachable or blocking automated requests.',
      kind: 'network',
    }
  }
})

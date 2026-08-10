import { createConnection } from 'node:net'

const CONNECT_TIMEOUT_MS = 3000

type PortCheckResult = 'open' | 'closed' | 'timeout'

function tryConnect(host: string, port: number): Promise<PortCheckResult> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port, timeout: CONNECT_TIMEOUT_MS })
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

  try {
    const result = await tryConnect(host, portNum)
    return { result }
  } catch {
    setResponseStatus(event, 502)
    return {
      error: 'Could not reach that host — it may be unreachable or blocking automated requests.',
      kind: 'network',
    }
  }
})

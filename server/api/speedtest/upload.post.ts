const MAX_BYTES = 10 * 1024 * 1024

/**
 * Reads the request body as a stream, counting bytes without storing them,
 * and times the read server-side. Rejects early once the hard cap is
 * exceeded so a misbehaving/malicious client can't force an unbounded read
 * regardless of what `Content-Length` it claims.
 */
export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const result = checkRateLimit(`speedtest:upload:${ip}`, { max: 6, windowMs: 5 * 60 * 1000 })
  if (!result.allowed) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
  }

  setResponseHeader(event, 'Cache-Control', 'no-store')

  const stream = getRequestWebStream(event)
  if (!stream) {
    return { receivedBytes: 0, serverMs: 0 }
  }

  const start = performance.now()
  let receivedBytes = 0
  const reader = stream.getReader()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      receivedBytes += value.byteLength
      if (receivedBytes > MAX_BYTES) {
        throw createError({ statusCode: 413, statusMessage: 'Payload too large' })
      }
    }
  } finally {
    reader.releaseLock()
  }

  return { receivedBytes, serverMs: performance.now() - start }
})

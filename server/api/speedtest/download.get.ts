import { randomBytes } from 'node:crypto'

const TOTAL_BYTES = 8 * 1024 * 1024
const CHUNK_BYTES = 64 * 1024

/**
 * Streams exactly 8MB of random (and therefore incompressible-by-construction)
 * bytes so a client-side byte-count/elapsed-time measurement isn't skewed by
 * gzip/brotli. Chunked so the full payload is never materialized in one buffer.
 */
export default defineEventHandler((event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const result = checkRateLimit(`speedtest:download:${ip}`, { max: 6, windowMs: 5 * 60 * 1000 })
  if (!result.allowed) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
  }

  setResponseHeaders(event, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/octet-stream',
    'Content-Length': String(TOTAL_BYTES),
  })

  let sent = 0
  return new ReadableStream({
    pull(controller) {
      if (sent >= TOTAL_BYTES) {
        controller.close()
        return
      }
      const size = Math.min(CHUNK_BYTES, TOTAL_BYTES - sent)
      controller.enqueue(new Uint8Array(randomBytes(size)))
      sent += size
    },
  })
})

/**
 * Trivial latency probe. The client fires several of these sequentially and
 * takes the median round-trip time as "ping" — this handler just needs to
 * respond as fast as possible with nothing cacheable in the way.
 */
export default defineEventHandler((event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const result = checkRateLimit(`speedtest:ping:${ip}`, { max: 30, windowMs: 5 * 60 * 1000 })
  if (!result.allowed) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
  }

  setResponseHeader(event, 'Cache-Control', 'no-store')
  return { ok: true }
})

/**
 * One HTTP round-trip to a user-supplied target, timed server-side. The
 * client fires this five times sequentially to build a small sample set.
 */
export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const rateLimit = checkRateLimit(`network:ping:${ip}`, { max: 25, windowMs: 5 * 60 * 1000 })
  if (!rateLimit.allowed) {
    setResponseStatus(event, 429)
    return { error: 'Too many checks — wait a moment and try again.', kind: 'rate-limited' }
  }

  const query = getQuery(event)
  const target = typeof query.target === 'string' ? query.target : ''

  const validation = await resolveAndValidateTarget(target)
  if (!validation.ok || !validation.url) {
    setResponseStatus(event, 400)
    return {
      error:
        validation.reason === 'blocked'
          ? "That address can't be checked (private or internal)."
          : "That doesn't look like a valid target.",
      kind: validation.reason ?? 'invalid',
    }
  }

  setResponseHeader(event, 'Cache-Control', 'no-store')

  try {
    const t0 = performance.now()
    let res = await safeFetch(validation.url, { method: 'HEAD' })
    if (res.status === 405) {
      res = await safeFetch(validation.url, { method: 'GET' })
    }
    const rttMs = performance.now() - t0
    return { rttMs }
  } catch {
    setResponseStatus(event, 502)
    return {
      error: 'Target did not respond — it may be unreachable or blocking automated requests.',
    }
  }
})

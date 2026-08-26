/**
 * Checks whether a user-supplied URL is currently reachable. Tries HEAD
 * first (cheapest) and falls back to GET when HEAD isn't supported,
 * immediately cancelling the body stream since only reachability and timing
 * matter here. A connection failure/timeout is a normal "down" result for
 * this tool, not a server-side error.
 */
export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const rateLimit = checkRateLimit(`network:uptime:${ip}`, { max: 20, windowMs: 5 * 60 * 1000 })
  if (!rateLimit.allowed) {
    setResponseStatus(event, 429)
    return { error: 'Too many checks — wait a moment and try again.', kind: 'rate-limited' }
  }

  const query = getQuery(event)
  const target = typeof query.url === 'string' ? query.url : ''

  const validation = await resolveAndValidateTarget(target)
  if (!validation.ok || !validation.url) {
    setResponseStatus(event, 400)
    return {
      error:
        validation.reason === 'blocked'
          ? "That address can't be checked (private or internal)."
          : "That doesn't look like a valid URL.",
      kind: validation.reason ?? 'invalid',
    }
  }

  setResponseHeader(event, 'Cache-Control', 'no-store')

  try {
    const t0 = performance.now()
    let response = await safeFetch(validation.url, { method: 'HEAD' })
    if (response.status === 405 || response.status === 501) {
      response.body?.cancel()
      response = await safeFetch(validation.url, { method: 'GET' })
    }
    const responseMs = performance.now() - t0
    response.body?.cancel()

    return {
      up: true,
      statusCode: response.status,
      statusText: response.statusText,
      responseMs,
    }
  } catch {
    return { up: false }
  }
})

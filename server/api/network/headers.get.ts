import { buildHeaderList } from '../../utils/httpHeaders'

/**
 * Inspects the response headers, status, and redirect chain for a
 * user-supplied URL. Tries HEAD first (cheapest) and falls back to GET when
 * HEAD isn't supported, immediately cancelling the body stream once headers
 * are read since only headers are needed here.
 */
export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const rateLimit = checkRateLimit(`network:headers:${ip}`, { max: 20, windowMs: 5 * 60 * 1000 })
  if (!rateLimit.allowed) {
    setResponseStatus(event, 429)
    return { error: 'Too many inspections — wait a moment and try again.', kind: 'rate-limited' }
  }

  const query = getQuery(event)
  const target = typeof query.url === 'string' ? query.url : ''

  const validation = await resolveAndValidateTarget(target)
  if (!validation.ok || !validation.url) {
    setResponseStatus(event, 400)
    return {
      error:
        validation.reason === 'blocked'
          ? "That address can't be inspected (private or internal)."
          : "That doesn't look like a valid URL.",
      kind: validation.reason ?? 'invalid',
    }
  }

  setResponseHeader(event, 'Cache-Control', 'no-store')

  try {
    let response = await safeFetch(validation.url, { method: 'HEAD' })
    if (response.status === 405 || response.status === 501) {
      response.body?.cancel()
      response = await safeFetch(validation.url, { method: 'GET' })
    }

    const headers = buildHeaderList(response)
    response.body?.cancel()

    const finalUrl = response.url || validation.url.toString()
    const redirected = finalUrl !== validation.url.toString()

    return {
      statusCode: response.status,
      statusText: response.statusText,
      headers,
      redirected,
      finalUrl,
    }
  } catch {
    setResponseStatus(event, 502)
    return {
      error: 'Target did not respond — it may be unreachable or blocking automated requests.',
      kind: 'network',
    }
  }
})

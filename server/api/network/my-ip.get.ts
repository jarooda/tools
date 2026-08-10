/**
 * Looks up the caller's own public IP and geolocation. The visitor's IP is
 * read from the request (not the server's own), then passed explicitly to
 * ipapi.co so the lookup is correct regardless of where this server runs.
 * Per-IP results are cached briefly in memory, same "simple in-memory
 * state" style as `server/api/fx.get.ts` and `server/utils/rateLimit.ts`.
 */
interface CacheEntry {
  data: { ip: string; geo: ReturnType<typeof mapIpapiResponse> }
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()
const TTL_MS = 10 * 60 * 1000

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true })
  if (!ip) {
    setResponseStatus(event, 400)
    return { error: "Couldn't determine your IP address." }
  }

  const rateLimit = checkRateLimit(`network:my-ip:${ip}`, { max: 20, windowMs: 5 * 60 * 1000 })
  if (!rateLimit.allowed) {
    setResponseStatus(event, 429)
    return { error: 'Too many requests — wait a moment and try again.' }
  }

  setResponseHeader(event, 'Cache-Control', 'no-store')

  const cached = cache.get(ip)
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return cached.data
  }

  let geo: ReturnType<typeof mapIpapiResponse> = null
  try {
    const upstream = await $fetch(`https://ipapi.co/${ip}/json/`)
    geo = mapIpapiResponse(upstream)
  } catch {
    geo = null
  }

  const data = { ip, geo }
  cache.set(ip, { data, fetchedAt: Date.now() })
  return data
})

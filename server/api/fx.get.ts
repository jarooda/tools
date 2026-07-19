/**
 * Live foreign-exchange rates for the currency converter.
 * Proxies the keyless open.er-api.com feed (base USD) and caches the result
 * in memory for an hour so we don't hammer the upstream. Falls back to the
 * last good snapshot if a refresh fails.
 */
interface FxSnapshot {
  base: string
  rates: Record<string, number>
  date: string
  fetchedAt: number
}

interface UpstreamResponse {
  result?: string
  base_code?: string
  rates?: Record<string, number>
  time_last_update_utc?: string
}

let cache: FxSnapshot | null = null
const TTL_MS = 60 * 60 * 1000 // 1 hour

export default defineEventHandler(async () => {
  const now = Date.now()
  if (cache && now - cache.fetchedAt < TTL_MS) {
    return { base: cache.base, rates: cache.rates, date: cache.date, cached: true }
  }

  try {
    const data = await $fetch<UpstreamResponse>('https://open.er-api.com/v6/latest/USD')
    if (data.result !== 'success' || !data.rates) {
      throw new Error('Unexpected upstream response')
    }
    cache = {
      base: data.base_code ?? 'USD',
      rates: data.rates,
      date: data.time_last_update_utc ?? new Date(now).toUTCString(),
      fetchedAt: now,
    }
    return { base: cache.base, rates: cache.rates, date: cache.date, cached: false }
  } catch {
    // Serve the stale snapshot rather than nothing, if we have one.
    if (cache) {
      return { base: cache.base, rates: cache.rates, date: cache.date, cached: true, stale: true }
    }
    throw createError({ statusCode: 502, statusMessage: 'Could not fetch exchange rates' })
  }
})

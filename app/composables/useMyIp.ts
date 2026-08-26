import { onMounted, ref } from 'vue'

export interface MyIpGeo {
  city: string | null
  region: string | null
  country: string | null
  countryCode: string | null
  timezone: string | null
  org: string | null
  lat: number | null
  lon: number | null
}

export type MyIpStatus = 'loading' | 'done' | 'error'

/**
 * Looks up the caller's public IP and geolocation via `/api/network/my-ip`.
 * Fetches after mount (client-only) to avoid an SSR hydration mismatch for
 * this kind of request-scoped data — same pattern as the other network tools.
 */
export function useMyIp() {
  const status = ref<MyIpStatus>('loading')
  const ip = ref<string | null>(null)
  const geo = ref<MyIpGeo | null>(null)
  const error = ref<string | null>(null)

  async function refresh() {
    status.value = 'loading'
    error.value = null

    let res: Response
    try {
      res = await fetch('/api/network/my-ip', { cache: 'no-store' })
    } catch {
      status.value = 'error'
      error.value = 'Could not reach the server — check your connection and try again.'
      return
    }

    const body = await res.json().catch(() => null)
    if (!res.ok || !body || typeof body.ip !== 'string') {
      status.value = 'error'
      error.value = body?.error ?? 'Something went wrong — try again.'
      return
    }

    ip.value = body.ip
    geo.value = body.geo ?? null
    status.value = 'done'
  }

  onMounted(refresh)

  return { status, ip, geo, error, refresh }
}

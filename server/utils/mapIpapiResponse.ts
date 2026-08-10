/**
 * Maps ipapi.co's `/json/` response shape to the internal geo shape used by
 * `server/api/network/my-ip.get.ts`. Kept as a pure function so field mapping
 * can be unit tested without touching the network.
 */
export interface IpapiResponse {
  error?: boolean
  reason?: string
  city?: unknown
  region?: unknown
  country_name?: unknown
  country_code?: unknown
  timezone?: unknown
  org?: unknown
  latitude?: unknown
  longitude?: unknown
}

export interface GeoInfo {
  city: string | null
  region: string | null
  country: string | null
  countryCode: string | null
  timezone: string | null
  org: string | null
  lat: number | null
  lon: number | null
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** Returns `null` if the upstream reported an error or the body is malformed. */
export function mapIpapiResponse(data: unknown): GeoInfo | null {
  if (!data || typeof data !== 'object') return null
  const d = data as IpapiResponse
  if (d.error) return null

  return {
    city: str(d.city),
    region: str(d.region),
    country: str(d.country_name),
    countryCode: str(d.country_code),
    timezone: str(d.timezone),
    org: str(d.org),
    lat: num(d.latitude),
    lon: num(d.longitude),
  }
}

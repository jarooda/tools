export interface HeaderRow {
  name: string
  value: string
}

interface HeadersWithSetCookie extends Headers {
  getSetCookie?: () => string[]
}

/**
 * Builds an ordered list of response headers, working around a Fetch API
 * quirk: `Headers.prototype.entries()` comma-joins multiple same-name
 * headers when iterated — except `set-cookie`, which browsers/undici keep
 * separate because cookie values can themselves contain commas. We pull
 * `set-cookie` values out via `getSetCookie()` (feature-detected, since it's
 * a newer API) and emit one row per cookie instead of trusting whatever
 * `.entries()` would give us for that header name.
 */
export function buildHeaderList(response: Response): HeaderRow[] {
  const rows: HeaderRow[] = []

  for (const [name, value] of response.headers.entries()) {
    if (name.toLowerCase() === 'set-cookie') continue
    rows.push({ name, value })
  }

  const headersWithSetCookie = response.headers as HeadersWithSetCookie
  const setCookies =
    typeof headersWithSetCookie.getSetCookie === 'function'
      ? headersWithSetCookie.getSetCookie()
      : []

  for (const cookie of setCookies) {
    rows.push({ name: 'set-cookie', value: cookie })
  }

  return rows
}

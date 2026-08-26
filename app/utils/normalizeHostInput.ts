const IPV6_BRACKETED = /^\[([0-9a-fA-F:]+)\](?::\d+)?$/
const IPV6_BARE = /^[0-9a-fA-F:]*:[0-9a-fA-F:]*$/

function isIpv6(value: string): boolean {
  return IPV6_BRACKETED.test(value) || IPV6_BARE.test(value)
}

/**
 * Strips scheme, path/query/fragment, port, and trailing dot from a raw
 * host/URL string typed or pasted by a user, leaving a bare hostname or IP.
 */
export function stripToHostname(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed

  let value = trimmed.replace(/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//, '')

  const bracketedIpv6 = value.match(/^\[([0-9a-fA-F:]+)\](?::\d+)?/)
  if (bracketedIpv6) {
    return bracketedIpv6[1]!.toLowerCase()
  }

  if (isIpv6(value)) {
    return value.toLowerCase()
  }

  value = value.split(/[/?#]/)[0] ?? value

  const portMatch = value.match(/^([^:]+):(\d+)$/)
  if (portMatch) {
    value = portMatch[1]!
  }

  value = value.replace(/\.+$/, '')

  return value.toLowerCase()
}

/**
 * Ensures a value has a URL scheme, defaulting to https:// when none is
 * present. Leaves an explicit scheme (e.g. http://) untouched.
 */
export function ensureScheme(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed

  if (/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmed)) {
    return trimmed
  }

  return `https://${trimmed}`
}

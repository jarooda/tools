/**
 * Curated allowlist of common ports the port checker will attempt to
 * connect to. Deliberately not an arbitrary 1-65535 scanner — that would
 * turn this tool into a scriptable port-scanning proxy.
 */
export const ALLOWED_PORTS = [
  21, 22, 23, 25, 53, 80, 110, 143, 443, 587, 993, 995, 3306, 3389, 5432, 6379, 8080, 27017,
] as const

export type AllowedPort = (typeof ALLOWED_PORTS)[number]

export function isAllowedPort(port: number): port is AllowedPort {
  return (ALLOWED_PORTS as readonly number[]).includes(port)
}

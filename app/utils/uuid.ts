/**
 * UUID generation — pure, DOM-free logic (unit-tested in `test/`).
 * Produces RFC 4122 version-4 UUIDs from cryptographically strong randomness
 * (`crypto.getRandomValues`, available in browsers and Node's webcrypto).
 */

const HEX: string[] = Array.from({ length: 256 }, (_v, i) => i.toString(16).padStart(2, '0'))

/** The nil UUID (all zeros). */
export const NIL_UUID = '00000000-0000-0000-0000-000000000000'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Generate a random v4 UUID. */
export function uuidV4(): string {
  const b = new Uint8Array(16)
  crypto.getRandomValues(b)
  // Set version (4) and variant (10xx) bits.
  b[6] = (b[6]! & 0x0f) | 0x40
  b[8] = (b[8]! & 0x3f) | 0x80
  const h = HEX
  return (
    h[b[0]!]! +
    h[b[1]!]! +
    h[b[2]!]! +
    h[b[3]!]! +
    '-' +
    h[b[4]!]! +
    h[b[5]!]! +
    '-' +
    h[b[6]!]! +
    h[b[7]!]! +
    '-' +
    h[b[8]!]! +
    h[b[9]!]! +
    '-' +
    h[b[10]!]! +
    h[b[11]!]! +
    h[b[12]!]! +
    h[b[13]!]! +
    h[b[14]!]! +
    h[b[15]!]!
  )
}

/** Generate `count` v4 UUIDs. */
export function uuidV4Batch(count: number): string[] {
  const n = Math.max(0, Math.floor(count))
  return Array.from({ length: n }, () => uuidV4())
}

/** Whether `s` looks like a valid UUID. */
export function isUuid(s: string): boolean {
  return UUID_RE.test(s.trim())
}

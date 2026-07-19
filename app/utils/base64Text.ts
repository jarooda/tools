/**
 * Base64 text encode/decode — pure, DOM-free logic (unit-tested in `test/`).
 * UTF-8 safe (handles emoji and accents) and supports URL-safe alphabet.
 * Uses the standard `btoa`/`atob` globals available in browsers and Node ≥16.
 */

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Encode text to Base64. `urlSafe` uses the `-_` alphabet and drops padding. */
export function encodeBase64(text: string, urlSafe = false): string {
  const b64 = bytesToBase64(new TextEncoder().encode(text))
  return urlSafe ? b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '') : b64
}

/** Decode Base64 (standard or URL-safe) back to text. Throws if malformed. */
export function decodeBase64(input: string): string {
  let b64 = input.trim().replace(/-/g, '+').replace(/_/g, '/')
  // Restore padding to a multiple of 4.
  const pad = b64.length % 4
  if (pad === 1) throw new Error('Not valid Base64')
  if (pad > 0) b64 += '='.repeat(4 - pad)
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64)) throw new Error('Not valid Base64')
  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(base64ToBytes(b64))
  } catch {
    throw new Error('Not valid Base64')
  }
}

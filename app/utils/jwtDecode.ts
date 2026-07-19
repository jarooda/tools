/**
 * JWT decoder — pure, DOM-free logic (unit-tested in `test/`).
 * Splits a token into header/payload/signature and base64url-decodes the two
 * JSON segments. It does NOT verify the signature (no key material involved).
 */
import { decodeBase64 } from './base64Text'

export interface DecodedJwt {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
}

function decodeSegment(segment: string, which: string): Record<string, unknown> {
  let json: string
  try {
    json = decodeBase64(segment)
  } catch {
    throw new Error(`Could not base64url-decode the ${which}`)
  }
  try {
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    throw new Error(`The ${which} is not valid JSON`)
  }
}

/** Decode a JWT into its parts. Throws if the structure is malformed. */
export function decodeJwt(token: string): DecodedJwt {
  const trimmed = token.trim().replace(/^Bearer\s+/i, '')
  const parts = trimmed.split('.')
  if (parts.length !== 3 || parts.some((p) => p === '')) {
    throw new Error('A JWT must have three dot-separated parts')
  }
  return {
    header: decodeSegment(parts[0]!, 'header'),
    payload: decodeSegment(parts[1]!, 'payload'),
    signature: parts[2]!,
  }
}

/** Human-readable UTC string for a numeric (seconds) timestamp claim. */
export function formatJwtTimestamp(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return new Date(value * 1000).toISOString()
}

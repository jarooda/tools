/**
 * Pure data-URL / Base64 helpers for the Image ↔ Base64 tool. DOM-free and
 * unit-tested; the page handles FileReader and <img> decoding.
 */

export interface ParsedDataUrl {
  mime: string
  base64: string
}

/** Parse a `data:<mime>;base64,<data>` URL into its parts, or `null`. */
export function parseDataUrl(input: string): ParsedDataUrl | null {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(input.trim())
  if (!match || !match[2]) return null
  return { mime: match[1] || 'text/plain', base64: match[3] || '' }
}

/** Loose check that a string looks like raw Base64 (allowing whitespace). */
export function isLikelyBase64(input: string): boolean {
  const s = input.replace(/\s/g, '')
  return s.length > 0 && s.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(s)
}

/**
 * Coerce user input to a usable data URL: pass through an existing data URL,
 * or wrap raw Base64 with the given MIME type. Returns `null` if neither.
 */
export function toDataUrl(input: string, fallbackMime = 'image/png'): string | null {
  const trimmed = input.trim()
  if (trimmed.startsWith('data:')) return parseDataUrl(trimmed) ? trimmed : null
  if (isLikelyBase64(trimmed)) return `data:${fallbackMime};base64,${trimmed.replace(/\s/g, '')}`
  return null
}

/** File extension for a known image MIME type (defaults to `png`). */
export function extensionForMime(mime: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  }
  return map[mime] ?? 'png'
}

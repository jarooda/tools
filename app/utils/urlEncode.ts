/**
 * URL encode/decode — pure, DOM-free logic (unit-tested in `test/`).
 * "Component" mode escapes every reserved character (encodeURIComponent);
 * "full" mode preserves URL structure (encodeURI).
 */

export type UrlMode = 'component' | 'full'

/** Percent-encode text. */
export function encodeUrl(text: string, mode: UrlMode = 'component'): string {
  return mode === 'full' ? encodeURI(text) : encodeURIComponent(text)
}

/** Decode percent-encoded text. Throws on malformed sequences. */
export function decodeUrl(text: string, mode: UrlMode = 'component'): string {
  try {
    return mode === 'full' ? decodeURI(text) : decodeURIComponent(text)
  } catch {
    throw new Error('Malformed percent-encoding')
  }
}

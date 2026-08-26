/**
 * Small pure helpers for parsing RDAP JSON responses.
 */

/**
 * Extracts the `fn` (formatted name) value out of an RDAP vcardArray, e.g.
 * `['vcard', [['version', {}, 'text', '4.0'], ['fn', {}, 'text', 'Registrar Name'], ...]]`.
 * Returns `null` if there's no `fn` entry or the input is malformed.
 */
export function extractVcardFn(vcardArray: unknown): string | null {
  if (!Array.isArray(vcardArray) || !Array.isArray(vcardArray[1])) return null

  for (const entry of vcardArray[1]) {
    if (Array.isArray(entry) && entry[0] === 'fn' && typeof entry[3] === 'string') {
      return entry[3]
    }
  }

  return null
}

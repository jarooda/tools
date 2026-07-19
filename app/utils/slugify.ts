/**
 * Slug generator — pure, DOM-free logic (unit-tested in `test/`).
 * Turns arbitrary text into a URL-friendly slug: strips diacritics, drops
 * punctuation, and joins words with a separator.
 */

export interface SlugOptions {
  /** Word separator (default '-'). */
  separator?: string
  /** Lowercase the result (default true). */
  lowercase?: boolean
  /** Also transliterate a few common symbols (& → and). */
  symbols?: boolean
}

const SYMBOL_MAP: Record<string, string> = {
  '&': ' and ',
  '@': ' at ',
  '%': ' percent ',
  '#': ' number ',
  $: ' dollar ',
  '€': ' euro ',
  '£': ' pound ',
}

/** Convert text to a slug. */
export function slugify(text: string, opts: SlugOptions = {}): string {
  const sep = opts.separator ?? '-'
  const lower = opts.lowercase ?? true

  // NFKD split accents into combining marks (U+0300–U+036F), then drop them.
  let s = text.normalize('NFKD').replace(/[̀-ͯ]/gu, '')

  if (opts.symbols) {
    s = s.replace(/[&@%#$€£]/gu, (m) => SYMBOL_MAP[m] ?? ' ')
  }

  if (lower) s = s.toLowerCase()

  s = s
    // keep letters, digits and spaces; everything else becomes a space
    .replace(/[^a-zA-Z0-9]+/gu, ' ')
    .trim()
    .replace(/\s+/gu, sep)

  return s
}

/**
 * Roman-numeral conversion — pure, DOM-free logic (unit-tested in `test/`).
 * Standard subtractive notation covers 1–3999 (no bar notation for larger).
 */

/** Smallest and largest values expressible in standard Roman numerals. */
export const ROMAN_MIN = 1
export const ROMAN_MAX = 3999

const TABLE: Array<[number, string]> = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

/** Canonical (well-formed) Roman numeral, uppercase. */
const CANONICAL = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/

/** Convert an integer in [1, 3999] to a Roman numeral. Throws if out of range. */
export function toRoman(n: number): string {
  if (!Number.isInteger(n)) throw new Error('Enter a whole number')
  if (n < ROMAN_MIN || n > ROMAN_MAX) {
    throw new Error(`Roman numerals cover ${ROMAN_MIN}–${ROMAN_MAX}`)
  }
  let remaining = n
  let out = ''
  for (const [value, symbol] of TABLE) {
    while (remaining >= value) {
      out += symbol
      remaining -= value
    }
  }
  return out
}

/** Whether `s` is a well-formed Roman numeral. */
export function isValidRoman(s: string): boolean {
  const clean = s.trim().toUpperCase()
  return clean !== '' && CANONICAL.test(clean)
}

/** Convert a Roman numeral to its integer value. Throws if malformed. */
export function fromRoman(s: string): number {
  const clean = s.trim().toUpperCase()
  if (clean === '') throw new Error('Enter a Roman numeral')
  if (!CANONICAL.test(clean)) throw new Error('Not a valid Roman numeral')
  const values: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }
  let total = 0
  for (let i = 0; i < clean.length; i++) {
    const cur = values[clean[i]!]!
    const next = i + 1 < clean.length ? values[clean[i + 1]!]! : 0
    total += cur < next ? -cur : cur
  }
  return total
}

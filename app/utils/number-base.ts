/**
 * Number-base conversion — pure, DOM-free logic (unit-tested in `test/`).
 * Parses a non-negative integer written in one radix and re-renders it in
 * binary, octal, decimal, and hexadecimal. Uses BigInt so arbitrarily large
 * values stay exact.
 */

export type NumberBase = 2 | 8 | 10 | 16

export interface BaseMeta {
  base: NumberBase
  name: string
  /** Conventional prefix, e.g. "0x" for hex ("" for decimal). */
  prefix: string
}

export const NUMBER_BASES: BaseMeta[] = [
  { base: 2, name: 'Binary', prefix: '0b' },
  { base: 8, name: 'Octal', prefix: '0o' },
  { base: 10, name: 'Decimal', prefix: '' },
  { base: 16, name: 'Hexadecimal', prefix: '0x' },
]

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'

/**
 * Parse `input` written in `base` to a BigInt. Ignores surrounding whitespace,
 * underscores (digit separators), and a matching `0b`/`0o`/`0x` prefix.
 * Throws if the string is empty or contains a digit invalid for the base.
 */
export function parseInBase(input: string, base: NumberBase): bigint {
  let s = input.trim().toLowerCase().replace(/_/g, '')
  const prefix = NUMBER_BASES.find((b) => b.base === base)!.prefix
  if (prefix && s.startsWith(prefix)) s = s.slice(prefix.length)
  if (s === '') throw new Error('Enter a number')
  const b = BigInt(base)
  let acc = 0n
  for (const ch of s) {
    const d = DIGITS.indexOf(ch)
    if (d < 0 || d >= base) {
      throw new Error(`"${ch}" is not a valid ${base === 16 ? 'hex' : `base-${base}`} digit`)
    }
    acc = acc * b + BigInt(d)
  }
  return acc
}

/** Whether `input` is a valid number in `base`. */
export function isValidInBase(input: string, base: NumberBase): boolean {
  try {
    parseInBase(input, base)
    return true
  } catch {
    return false
  }
}

/** Render a BigInt in `base` (hex letters uppercased). */
export function toBase(value: bigint, base: NumberBase): string {
  return value.toString(base).toUpperCase()
}

export interface BaseResult extends BaseMeta {
  /** The value rendered in this base (no prefix). */
  display: string
}

/**
 * Parse `input` (written in `from` base) and render it in every base.
 * Throws the same errors as {@link parseInBase} for invalid input.
 */
export function convertNumberBase(input: string, from: NumberBase): BaseResult[] {
  const value = parseInBase(input, from)
  return NUMBER_BASES.map((b) => ({ ...b, display: toBase(value, b.base) }))
}

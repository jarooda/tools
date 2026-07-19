/**
 * Random numbers & pickers — pure, DOM-free logic (unit-tested in `test/`).
 * All randomness comes from `crypto.getRandomValues` with rejection sampling so
 * results are unbiased. Names are unique across `app/utils/` for auto-import.
 */

/** Unbiased integer in `[0, maxExclusive)`. */
function randBelow(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0
  const arr = new Uint32Array(1)
  const limit = Math.floor(0xffffffff / maxExclusive) * maxExclusive
  let x: number
  do {
    crypto.getRandomValues(arr)
    x = arr[0]!
  } while (x >= limit)
  return x % maxExclusive
}

/** Unbiased integer in `[min, max]` (inclusive). Order of args is normalised. */
export function secureRandomInt(min: number, max: number): number {
  const lo = Math.ceil(Math.min(min, max))
  const hi = Math.floor(Math.max(min, max))
  return lo + randBelow(hi - lo + 1)
}

/**
 * `count` random integers in `[min, max]`. When `unique` is set, returns
 * distinct values (capped at the size of the range).
 */
export function secureRandomInts(
  min: number,
  max: number,
  count: number,
  unique = false,
): number[] {
  const lo = Math.ceil(Math.min(min, max))
  const hi = Math.floor(Math.max(min, max))
  const n = Math.max(0, Math.floor(count))
  if (!unique) return Array.from({ length: n }, () => secureRandomInt(lo, hi))

  const rangeSize = hi - lo + 1
  const take = Math.min(n, rangeSize)
  const seen = new Set<number>()
  while (seen.size < take) seen.add(secureRandomInt(lo, hi))
  return [...seen]
}

/** Roll `count` dice of `sides` faces each. */
export function rollDice(sides: number, count = 1): number[] {
  const s = Math.max(2, Math.floor(sides))
  const n = Math.max(1, Math.floor(count))
  return Array.from({ length: n }, () => secureRandomInt(1, s))
}

/** Flip a coin. */
export function flipCoin(): 'Heads' | 'Tails' {
  return randBelow(2) === 0 ? 'Heads' : 'Tails'
}

/** Fisher–Yates shuffle returning a new array (input is not mutated). */
export function shuffleList<T>(items: readonly T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = randBelow(i + 1)
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/**
 * Pick `count` items from a list. `unique` picks without replacement (capped at
 * the list length); otherwise picks may repeat.
 */
export function pickItems<T>(items: readonly T[], count = 1, unique = true): T[] {
  const n = Math.max(0, Math.floor(count))
  if (items.length === 0 || n === 0) return []
  if (unique) return shuffleList(items).slice(0, Math.min(n, items.length))
  return Array.from({ length: n }, () => items[randBelow(items.length)]!)
}

/** Split raw textarea input into trimmed, non-empty lines. */
export function parsePickList(raw: string): string[] {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}

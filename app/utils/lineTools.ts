/**
 * Line operations — pure, DOM-free logic (unit-tested in `test/`).
 * Split text into lines and apply a pipeline of transforms in a fixed order:
 * trim → remove empty → dedupe → sort/reverse/shuffle.
 */

export type LineSort = 'none' | 'asc' | 'desc' | 'length' | 'reverse' | 'shuffle'

export interface LineOptions {
  trim?: boolean
  removeEmpty?: boolean
  dedupe?: boolean
  /** Case-insensitive comparison for dedupe and sort. */
  ignoreCase?: boolean
  sort?: LineSort
  /** Injectable RNG for deterministic shuffle tests (defaults to Math.random). */
  rng?: () => number
}

export interface LineResult {
  lines: string[]
  text: string
  /** Number of lines removed (empties + duplicates) vs. the input. */
  removed: number
}

function splitLines(text: string): string[] {
  return text.split(/\r\n|\r|\n/u)
}

/** Fisher–Yates shuffle using an injectable RNG. */
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/** Apply the line pipeline and return the result plus how many lines were dropped. */
export function transformLines(text: string, opts: LineOptions = {}): LineResult {
  const originalCount = text === '' ? 0 : splitLines(text).length
  let lines = splitLines(text)

  if (opts.trim) lines = lines.map((l) => l.trim())
  if (opts.removeEmpty) lines = lines.filter((l) => l.trim() !== '')

  if (opts.dedupe) {
    const seen = new Set<string>()
    lines = lines.filter((l) => {
      const key = opts.ignoreCase ? l.toLowerCase() : l
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  const cmp = opts.ignoreCase
    ? (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase())
    : (a: string, b: string) => a.localeCompare(b)

  switch (opts.sort) {
    case 'asc':
      lines = lines.slice().sort(cmp)
      break
    case 'desc':
      lines = lines.slice().sort((a, b) => cmp(b, a))
      break
    case 'length':
      lines = lines.slice().sort((a, b) => a.length - b.length || cmp(a, b))
      break
    case 'reverse':
      lines = lines.slice().reverse()
      break
    case 'shuffle':
      lines = shuffle(lines, opts.rng ?? Math.random)
      break
    default:
      break
  }

  return { lines, text: lines.join('\n'), removed: Math.max(0, originalCount - lines.length) }
}

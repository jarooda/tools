/**
 * Text diffing — pure, DOM-free logic (unit-tested in `test/`).
 * Core is a generic longest-common-subsequence diff over an array of tokens,
 * specialised for line diffs (`diffLines`), word diffs (`diffWords`), and a
 * side-by-side line-alignment view with intra-line word highlights
 * (`diffSideBySide`) used by the side-by-side diff tool.
 */

export type DiffType = 'equal' | 'add' | 'remove'

export interface DiffRow {
  type: DiffType
  value: string
  /** 1-based line number in the original (a) text, if present. */
  aLine?: number
  /** 1-based line number in the new (b) text, if present. */
  bLine?: number
}

export interface DiffStats {
  added: number
  removed: number
  unchanged: number
}

/** One token-level diff result: `equal` items carry both indices. */
export interface DiffTokenRow<T> {
  type: DiffType
  value: T
  /** Index in `a`, present for `equal` and `remove` rows. */
  aIndex?: number
  /** Index in `b`, present for `equal` and `add` rows. */
  bIndex?: number
}

function splitLines(text: string): string[] {
  if (text === '') return []
  return text.split(/\r\n|\r|\n/u)
}

/**
 * Generic LCS diff over two arrays of tokens, compared by `key`. The
 * building block for `diffLines` (tokens = lines) and `diffWords`
 * (tokens = words/whitespace/punctuation).
 */
export function diffTokens<T>(a: T[], b: T[], key: (t: T) => string): DiffTokenRow<T>[] {
  const n = a.length
  const m = b.length
  const ka = a.map(key)
  const kb = b.map(key)

  // LCS length table.
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] =
        ka[i] === kb[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!)
    }
  }

  const rows: DiffTokenRow<T>[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (ka[i] === kb[j]) {
      rows.push({ type: 'equal', value: a[i]!, aIndex: i, bIndex: j })
      i++
      j++
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      rows.push({ type: 'remove', value: a[i]!, aIndex: i })
      i++
    } else {
      rows.push({ type: 'add', value: b[j]!, bIndex: j })
      j++
    }
  }
  while (i < n) rows.push({ type: 'remove', value: a[i]!, aIndex: i++ })
  while (j < m) rows.push({ type: 'add', value: b[j]!, bIndex: j++ })

  return rows
}

/** Diff two texts line by line. */
export function diffLines(a: string, b: string): DiffRow[] {
  const aa = splitLines(a)
  const bb = splitLines(b)
  return diffTokens(aa, bb, (line) => line).map((r) => ({
    type: r.type,
    value: r.value,
    aLine: r.aIndex !== undefined ? r.aIndex + 1 : undefined,
    bLine: r.bIndex !== undefined ? r.bIndex + 1 : undefined,
  }))
}

/** Summarise a diff into added / removed / unchanged counts. */
export function diffStats(rows: DiffRow[]): DiffStats {
  const stats: DiffStats = { added: 0, removed: 0, unchanged: 0 }
  for (const r of rows) {
    if (r.type === 'add') stats.added++
    else if (r.type === 'remove') stats.removed++
    else stats.unchanged++
  }
  return stats
}

export interface WordDiffSpan {
  type: DiffType
  text: string
}

// Splits on runs of whitespace, runs of word characters, or single
// punctuation characters — every character belongs to exactly one
// alternative, so re-joining the tokens always reproduces the input exactly.
const WORD_TOKEN_RE = /\s+|[A-Za-z0-9_]+|[^\sA-Za-z0-9_]/gu

function tokenizeWords(text: string): string[] {
  return text.match(WORD_TOKEN_RE) ?? []
}

/** Word-level diff of two lines, merging consecutive same-type tokens into spans. */
export function diffWords(a: string, b: string): WordDiffSpan[] {
  const rows = diffTokens(tokenizeWords(a), tokenizeWords(b), (t) => t)
  const spans: WordDiffSpan[] = []
  for (const r of rows) {
    const last = spans[spans.length - 1]
    if (last && last.type === r.type) last.text += r.value
    else spans.push({ type: r.type, text: r.value })
  }
  return spans
}

/** A single line rendered in one side of the side-by-side view. */
export interface SideLine {
  type: DiffType | 'filler'
  lineNumber?: number
  text?: string
  /** Word-level spans, only present for lines paired in a replace block. */
  spans?: WordDiffSpan[]
}

export interface SideBySideRow {
  left: SideLine
  right: SideLine
}

export interface SideBySideResult {
  rows: SideBySideRow[]
  stats: DiffStats
  /** False when the performance guard skipped the word-level pass. */
  wordLevel: boolean
}

/** Above this combined line count or byte size, skip word-level highlighting. */
export const DIFF_MAX_LINES = 2000
export const DIFF_MAX_BYTES = 300_000

function normalizeWhitespace(line: string): string {
  return line.trim().replace(/\s+/gu, ' ')
}

/**
 * Line-aligns two texts (git-style: remove block directly followed by an
 * add block of the same size is treated as a "replace" and gets word-level
 * highlight spans; unpaired adds/removes get full-line highlight only) for
 * side-by-side rendering.
 */
export function diffSideBySide(
  a: string,
  b: string,
  opts: { ignoreWhitespace?: boolean } = {},
): SideBySideResult {
  const ignoreWhitespace = opts.ignoreWhitespace ?? false
  const aLines = splitLines(a)
  const bLines = splitLines(b)

  const wordLevel =
    aLines.length + bLines.length <= DIFF_MAX_LINES && a.length + b.length <= DIFF_MAX_BYTES

  const key = ignoreWhitespace ? normalizeWhitespace : (line: string) => line
  const lineRows = diffTokens(aLines, bLines, key)

  const stats: DiffStats = { added: 0, removed: 0, unchanged: 0 }
  for (const r of lineRows) {
    if (r.type === 'add') stats.added++
    else if (r.type === 'remove') stats.removed++
    else stats.unchanged++
  }

  const rows: SideBySideRow[] = []
  let idx = 0
  while (idx < lineRows.length) {
    const row = lineRows[idx]!
    if (row.type === 'equal') {
      rows.push({
        left: { type: 'equal', lineNumber: row.aIndex! + 1, text: aLines[row.aIndex!]! },
        right: { type: 'equal', lineNumber: row.bIndex! + 1, text: bLines[row.bIndex!]! },
      })
      idx++
      continue
    }

    const removeStart = idx
    while (idx < lineRows.length && lineRows[idx]!.type === 'remove') idx++
    const removes = lineRows.slice(removeStart, idx)

    const addStart = idx
    while (idx < lineRows.length && lineRows[idx]!.type === 'add') idx++
    const adds = lineRows.slice(addStart, idx)

    const pairCount = Math.min(removes.length, adds.length)
    for (let k = 0; k < pairCount; k++) {
      const rm = removes[k]!
      const ad = adds[k]!
      const leftText = aLines[rm.aIndex!]!
      const rightText = bLines[ad.bIndex!]!
      const spans = wordLevel ? diffWords(leftText, rightText) : undefined
      rows.push({
        left: {
          type: 'remove',
          lineNumber: rm.aIndex! + 1,
          text: leftText,
          spans: spans?.filter((s) => s.type !== 'add'),
        },
        right: {
          type: 'add',
          lineNumber: ad.bIndex! + 1,
          text: rightText,
          spans: spans?.filter((s) => s.type !== 'remove'),
        },
      })
    }
    for (let k = pairCount; k < removes.length; k++) {
      const rm = removes[k]!
      rows.push({
        left: { type: 'remove', lineNumber: rm.aIndex! + 1, text: aLines[rm.aIndex!]! },
        right: { type: 'filler' },
      })
    }
    for (let k = pairCount; k < adds.length; k++) {
      const ad = adds[k]!
      rows.push({
        left: { type: 'filler' },
        right: { type: 'add', lineNumber: ad.bIndex! + 1, text: bLines[ad.bIndex!]! },
      })
    }
  }

  return { rows, stats, wordLevel }
}

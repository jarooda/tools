/**
 * Line-based text diff — pure, DOM-free logic (unit-tested in `test/`).
 * Computes a longest-common-subsequence diff over lines, returning a list of
 * rows tagged equal / added / removed for rendering side-by-side or inline.
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

function splitLines(text: string): string[] {
  if (text === '') return []
  return text.split(/\r\n|\r|\n/u)
}

/** Diff two texts line by line. */
export function diffLines(a: string, b: string): DiffRow[] {
  const aa = splitLines(a)
  const bb = splitLines(b)
  const n = aa.length
  const m = bb.length

  // LCS length table.
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] =
        aa[i] === bb[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!)
    }
  }

  const rows: DiffRow[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (aa[i] === bb[j]) {
      rows.push({ type: 'equal', value: aa[i]!, aLine: i + 1, bLine: j + 1 })
      i++
      j++
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      rows.push({ type: 'remove', value: aa[i]!, aLine: i + 1 })
      i++
    } else {
      rows.push({ type: 'add', value: bb[j]!, bLine: j + 1 })
      j++
    }
  }
  while (i < n) rows.push({ type: 'remove', value: aa[i]!, aLine: ++i })
  while (j < m) rows.push({ type: 'add', value: bb[j]!, bLine: ++j })

  return rows
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

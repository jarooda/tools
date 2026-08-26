/**
 * Descriptive statistics — pure, dependency-free (unit-tested in `test/`).
 */

export interface ParsedNumberList {
  values: number[]
  invalidTokens: string[]
}

export interface StatisticsResult {
  count: number
  sum: number
  mean: number
  median: number
  /** All values tied for the highest frequency. Empty when no value repeats. */
  mode: number[]
  min: number
  max: number
  range: number
  varPopulation: number
  /** `null` when there are fewer than 2 values — sample variance is undefined. */
  varSample: number | null
  stdevPopulation: number
  /** `null` when there are fewer than 2 values — sample stdev is undefined. */
  stdevSample: number | null
  q1: number
  q3: number
  iqr: number
}

/**
 * Splits raw text on commas and whitespace (spaces, tabs, newlines), drops
 * empty tokens, and parses the rest as numbers. Tokens that don't parse as a
 * finite number are returned separately in `invalidTokens` rather than
 * silently dropped, so the caller can warn about them.
 */
export function parseNumberList(raw: string): ParsedNumberList {
  const tokens = raw
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)

  const values: number[] = []
  const invalidTokens: string[] = []

  for (const token of tokens) {
    const n = Number(token)
    if (Number.isFinite(n)) {
      values.push(n)
    } else {
      invalidTokens.push(token)
    }
  }

  return { values, invalidTokens }
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

function sorted(values: number[]): number[] {
  return [...values].sort((a, b) => a - b)
}

function median(sortedValues: number[]): number {
  const n = sortedValues.length
  const mid = Math.floor(n / 2)
  return n % 2 === 0 ? (sortedValues[mid - 1]! + sortedValues[mid]!) / 2 : sortedValues[mid]!
}

function mode(values: number[]): number[] {
  const counts = new Map<number, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  const maxCount = Math.max(...counts.values())
  if (maxCount <= 1) return []
  return [...counts.entries()]
    .filter(([, c]) => c === maxCount)
    .map(([v]) => v)
    .sort((a, b) => a - b)
}

/**
 * Percentile using linear interpolation between closest ranks (the "R-7" /
 * Excel `QUARTILE.INC` / `PERCENTILE.INC` method — also numpy's default
 * `np.percentile`). Chosen over the exclusive/nearest-rank variants because
 * it's the most common default across spreadsheets and stats libraries, so
 * results match what most users expect to see.
 */
function percentile(sortedValues: number[], p: number): number {
  const n = sortedValues.length
  if (n === 1) return sortedValues[0]!
  const rank = p * (n - 1)
  const lowerIndex = Math.floor(rank)
  const upperIndex = Math.ceil(rank)
  const frac = rank - lowerIndex
  const lower = sortedValues[lowerIndex]!
  const upper = sortedValues[upperIndex]!
  return lower + (upper - lower) * frac
}

function variance(values: number[], m: number, divisor: number): number {
  const sumSquaredDiffs = values.reduce((acc, v) => acc + (v - m) ** 2, 0)
  return sumSquaredDiffs / divisor
}

export function computeStatistics(values: number[]): StatisticsResult {
  const n = values.length
  const s = sorted(values)
  const sum = values.reduce((a, b) => a + b, 0)
  const m = mean(values)
  const varPopulation = variance(values, m, n)
  const varSample = n < 2 ? null : variance(values, m, n - 1)
  const q1 = percentile(s, 0.25)
  const q3 = percentile(s, 0.75)

  return {
    count: n,
    sum,
    mean: m,
    median: median(s),
    mode: mode(values),
    min: s[0]!,
    max: s[n - 1]!,
    range: s[n - 1]! - s[0]!,
    varPopulation,
    varSample,
    stdevPopulation: Math.sqrt(varPopulation),
    stdevSample: varSample === null ? null : Math.sqrt(varSample),
    q1,
    q3,
    iqr: q3 - q1,
  }
}

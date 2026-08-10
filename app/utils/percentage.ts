/**
 * Percentage arithmetic — pure, dependency-free (unit-tested in `test/`).
 */

/** `percent`% of `value`, e.g. `percentOf(20, 150) === 30`. */
export function percentOf(percent: number, value: number): number {
  return (percent / 100) * value
}

/** What percent `part` is of `whole`. `null` when `whole` is zero. */
export function whatPercent(part: number, whole: number): number | null {
  if (whole === 0) return null
  return (part / whole) * 100
}

/**
 * Percent and absolute change from `from` to `to`. `null` when `from` is
 * zero, since percent change is undefined relative to a zero baseline.
 */
export function percentChange(from: number, to: number): { pct: number; abs: number } | null {
  if (from === 0) return null
  const abs = to - from
  return { pct: (abs / from) * 100, abs }
}

/** `value` increased or decreased by `percent`%. */
export function adjustByPercent(
  value: number,
  percent: number,
  direction: 'increase' | 'decrease',
): { result: number; deltaAmount: number } {
  const change = percentOf(percent, value)
  const deltaAmount = direction === 'increase' ? change : -change
  return { result: value + deltaAmount, deltaAmount }
}

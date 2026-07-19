/**
 * Pure file-size helpers shared across the image tools. DOM-free, unit-tested.
 */

/** Human-readable byte size, e.g. `1536` → `"1.5 KB"`. */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return ''
  if (n < 1024) return `${n} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = n
  let i = -1
  do {
    value /= 1024
    i++
  } while (value >= 1024 && i < units.length - 1)
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`
}

/**
 * How much smaller `after` is than `before`, as a rounded percentage.
 * Positive = shrank, negative = grew. Returns 0 when `before` is 0.
 */
export function percentSmaller(before: number, after: number): number {
  if (before <= 0) return 0
  return Math.round((1 - after / before) * 100)
}

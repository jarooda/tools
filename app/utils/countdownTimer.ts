/**
 * Countdown/stopwatch timing math — pure, DOM-free logic (unit-tested in
 * `test/`). Elapsed time is always recomputed from `accumulatedMs` +
 * `(now - startTimestamp)` rather than incremented per tick, so background-tab
 * `setInterval` throttling can never cause drift — a late tick just recomputes
 * a bigger delta instead of losing time.
 */

const HOUR_MS = 3_600_000
const MINUTE_MS = 60_000
const SECOND_MS = 1000

/**
 * Elapsed time given accumulated time from prior run(s), the timestamp the
 * current run started/resumed at (`null` when not running), and the current
 * clock reading. `startTimestamp` and `now` should come from the same clock
 * (e.g. both `performance.now()` or both `Date.now()`).
 */
export function computeElapsedMs(
  accumulatedMs: number,
  startTimestamp: number | null,
  now: number,
): number {
  if (startTimestamp === null) return accumulatedMs
  return accumulatedMs + Math.max(0, now - startTimestamp)
}

/** Remaining countdown time, clamped to `[0, targetMs]`. */
export function computeRemainingMs(targetMs: number, elapsedMs: number): number {
  return Math.min(targetMs, Math.max(0, targetMs - elapsedMs))
}

/** Duration in ms from separate hour/minute/second parts. */
export function msFromParts(hours: number, minutes: number, seconds: number): number {
  return (
    Math.max(0, hours) * HOUR_MS +
    Math.max(0, minutes) * MINUTE_MS +
    Math.max(0, seconds) * SECOND_MS
  )
}

/**
 * Clock-face string for a duration: `H:MM:SS` once an hour is reached,
 * `MM:SS` otherwise.
 */
export function formatCountdownClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

/** "5 minutes" / "3 minutes 12 seconds" / "45 seconds" style spoken duration. */
export function formatDurationWords(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60

  const parts: string[] = []
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`)
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`)
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`)
  return parts.join(' ')
}

/**
 * Timecode helpers shared by the `/media/*` tools.
 *
 * Pure, DOM-free logic: parsing/formatting the `HH:MM:SS.mmm` strings ffmpeg
 * expects on `-ss`/`-to`, plus range clamping for the trim UI.
 */

/** Pad a number to at least two digits (`7` → `"07"`). */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/**
 * Seconds → the `HH:MM:SS.mmm` form ffmpeg accepts for seek arguments.
 * Negative and non-finite inputs collapse to zero so we never emit `-00:00:01`.
 */
export function formatTimecode(seconds: number): string {
  const total = Number.isFinite(seconds) && seconds > 0 ? seconds : 0
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = Math.floor(total % 60)
  const ms = Math.round((total - Math.floor(total)) * 1000)
  // Rounding milliseconds can carry into the next second (e.g. 1.9996 → 2.000).
  if (ms === 1000) return formatTimecode(Math.floor(total) + 1)
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(secs)}.${String(ms).padStart(3, '0')}`
}

/**
 * Short human clock for labels: `9.4` → `0:09`, `3723` → `1:02:03`.
 * Hours are only shown when the duration actually reaches an hour.
 */
export function formatClock(seconds: number): string {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  return hours > 0 ? `${hours}:${pad2(minutes)}:${pad2(secs)}` : `${minutes}:${pad2(secs)}`
}

/**
 * Parse a user-typed timecode into seconds. Accepts `SS`, `MM:SS`, and
 * `HH:MM:SS`, each with an optional decimal part. Returns `null` for anything
 * unparseable so callers can keep the previous value instead of jumping to 0.
 */
export function parseTimecode(input: string): number | null {
  const text = input.trim()
  if (!text) return null
  const parts = text.split(':')
  if (parts.length > 3) return null
  let seconds = 0
  for (const part of parts) {
    if (!/^\d*\.?\d+$/.test(part)) return null
    seconds = seconds * 60 + Number(part)
  }
  return Number.isFinite(seconds) ? seconds : null
}

/**
 * Keep a start/end selection inside `[0, duration]` and ordered. `end` is
 * pulled back to `duration` and pushed to at least `start`, so the caller can
 * feed slider/text edits straight in without guarding each one.
 */
export function clampTimeRange(
  start: number,
  end: number,
  duration: number,
): { start: number; end: number } {
  const max = Number.isFinite(duration) && duration > 0 ? duration : 0
  const safeStart = Math.min(Math.max(start, 0), max)
  const safeEnd = Math.min(Math.max(end, safeStart), max)
  return { start: safeStart, end: safeEnd }
}

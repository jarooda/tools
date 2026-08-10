/**
 * Date difference / duration calculation — pure, DOM-free logic (unit-tested
 * in `test/`). The calendar Y/M/D breakdown is computed with UTC-anchored
 * `Date.UTC(y, m, d)` values rather than local-midnight `Date` objects, so a
 * DST transition can never silently shift a date-only day count by ±1.
 */

export type Granularity = 'date' | 'datetime'

export interface CalendarBreakdown {
  years: number
  months: number
  days: number
}

const DAY_MS = 86_400_000

/**
 * Calendar year/month/day breakdown between two UTC-anchored instants,
 * treating `a` and `b` as unordered (the result is always the unsigned span).
 */
export function calendarBreakdown(aMs: number, bMs: number): CalendarBreakdown {
  const startMs = Math.min(aMs, bMs)
  const endMs = Math.max(aMs, bMs)

  const start = new Date(startMs)
  const end = new Date(endMs)

  let years = end.getUTCFullYear() - start.getUTCFullYear()
  let months = end.getUTCMonth() - start.getUTCMonth()
  let days = end.getUTCDate() - start.getUTCDate()

  if (days < 0) {
    months -= 1
    const prevMonthDate = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0))
    days += prevMonthDate.getUTCDate()
  }
  if (months < 0) {
    years -= 1
    months += 12
  }

  return { years, months, days }
}

/** Whole days between two instants, from the raw millisecond difference. */
export function totalDays(aMs: number, bMs: number): number {
  return Math.floor(Math.abs(bMs - aMs) / DAY_MS)
}

export function totalWeeks(aMs: number, bMs: number): number {
  return Math.abs(bMs - aMs) / (DAY_MS * 7)
}

/** Approximate months, using the average Gregorian month length. */
export function totalMonthsApprox(aMs: number, bMs: number): number {
  return Math.abs(bMs - aMs) / ((DAY_MS * 365.2425) / 12)
}

/** Approximate years, using the average Gregorian year length. */
export function totalYearsApprox(aMs: number, bMs: number): number {
  return Math.abs(bMs - aMs) / (DAY_MS * 365.2425)
}

export function totalHours(aMs: number, bMs: number): number {
  return Math.abs(bMs - aMs) / 3_600_000
}

export function totalMinutes(aMs: number, bMs: number): number {
  return Math.abs(bMs - aMs) / 60_000
}

export function totalSeconds(aMs: number, bMs: number): number {
  return Math.abs(bMs - aMs) / 1000
}

export function isSameInstant(aMs: number, bMs: number): boolean {
  return aMs === bMs
}

export function isReversed(startMs: number, endMs: number): boolean {
  return endMs < startMs
}

/** "1 year, 2 months, 10 days" style summary; omits zero-value units. */
export function formatCalendarBreakdown(breakdown: CalendarBreakdown): string {
  const parts: string[] = []
  if (breakdown.years > 0) parts.push(`${breakdown.years} year${breakdown.years === 1 ? '' : 's'}`)
  if (breakdown.months > 0)
    parts.push(`${breakdown.months} month${breakdown.months === 1 ? '' : 's'}`)
  if (breakdown.days > 0 || parts.length === 0)
    parts.push(`${breakdown.days} day${breakdown.days === 1 ? '' : 's'}`)
  return parts.join(', ')
}

/** Parse a `date` input value (`YYYY-MM-DD`) into a UTC-anchored epoch ms. */
export function parseDateOnly(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!m) return null
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(ms) ? null : ms
}

/** Parse a `datetime-local` input value (`YYYY-MM-DDTHH:mm`) into UTC-anchored epoch ms. */
export function parseDateTimeLocal(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim())
  if (!m) return null
  const ms = Date.UTC(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    Number(m[6] ?? '0'),
  )
  return Number.isNaN(ms) ? null : ms
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Format a UTC-anchored epoch ms value as a `date` input value. */
export function formatDateOnly(ms: number): string {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** Format a UTC-anchored epoch ms value as a `datetime-local` input value. */
export function formatDateTimeLocal(ms: number): string {
  const d = new Date(ms)
  return `${formatDateOnly(ms)}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

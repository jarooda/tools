/**
 * Unix timestamp conversion — pure, DOM-free logic (unit-tested in `test/`).
 * Everything routes through a single epoch-millisecond instant; the
 * timestamp text and the date/time text are just two different renderings
 * of that instant.
 */

export type TimestampUnit = 'seconds' | 'milliseconds'
export type ZoneMode = 'local' | 'utc'

/** The valid JS `Date` range: ±8,640,000,000,000,000 ms from the epoch. */
export const MIN_DATE_MS = -8_640_000_000_000_000
export const MAX_DATE_MS = 8_640_000_000_000_000

export interface TimestampParseResult {
  ok: boolean
  ms?: number
  error?: string
}

/** Parse a Unix timestamp string (seconds or milliseconds) into epoch ms. */
export function parseTimestamp(raw: string, unit: TimestampUnit): TimestampParseResult {
  const trimmed = raw.trim()
  if (!/^-?\d+$/.test(trimmed)) {
    return { ok: false, error: 'Enter a whole number of digits, e.g. 1700000000.' }
  }
  const n = Number(trimmed)
  if (!Number.isSafeInteger(n)) {
    return { ok: false, error: 'That number is too large to represent.' }
  }
  const ms = unit === 'seconds' ? n * 1000 : n
  if (ms < MIN_DATE_MS || ms > MAX_DATE_MS) {
    return { ok: false, error: 'Out of range for a JavaScript date.' }
  }
  return { ok: true, ms }
}

/** Format an epoch-ms instant as a Unix timestamp string in the given unit. */
export function formatTimestamp(ms: number, unit: TimestampUnit): string {
  return unit === 'seconds' ? String(Math.round(ms / 1000)) : String(Math.round(ms))
}

function pad(n: number, len = 2): string {
  return String(Math.abs(n)).padStart(len, '0')
}

/** Format an epoch-ms instant as a `datetime-local` input value (with seconds). */
export function msToDatetimeLocal(ms: number, zone: ZoneMode): string {
  const d = new Date(ms)
  const parts =
    zone === 'utc'
      ? {
          y: d.getUTCFullYear(),
          mo: d.getUTCMonth(),
          day: d.getUTCDate(),
          h: d.getUTCHours(),
          mi: d.getUTCMinutes(),
          s: d.getUTCSeconds(),
        }
      : {
          y: d.getFullYear(),
          mo: d.getMonth(),
          day: d.getDate(),
          h: d.getHours(),
          mi: d.getMinutes(),
          s: d.getSeconds(),
        }
  return `${pad(parts.y, 4)}-${pad(parts.mo + 1)}-${pad(parts.day)}T${pad(parts.h)}:${pad(parts.mi)}:${pad(parts.s)}`
}

const DATETIME_LOCAL_RE = /^(\d{1,6})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/

/** Parse a `datetime-local` input value, interpreted in the given zone, into epoch ms. */
export function parseDatetimeLocal(value: string, zone: ZoneMode): number | null {
  const m = DATETIME_LOCAL_RE.exec(value.trim())
  if (!m) return null
  const [, y, mo, day, h, mi, s] = m
  const args: [number, number, number, number, number, number] = [
    Number(y),
    Number(mo) - 1,
    Number(day),
    Number(h),
    Number(mi),
    Number(s ?? '0'),
  ]
  const ms = zone === 'utc' ? Date.UTC(...args) : new Date(...args).getTime()
  return Number.isNaN(ms) ? null : ms
}

export function formatIso8601(ms: number): string {
  return new Date(ms).toISOString()
}

/** RFC 2822 style, always in UTC (matches `Date.prototype.toUTCString`). */
export function formatRfc2822Utc(ms: number): string {
  return new Date(ms).toUTCString()
}

export function formatLocalString(ms: number): string {
  return new Date(ms).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'long' })
}

export function formatUtcStringLong(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'long',
    timeZone: 'UTC',
  })
}

const RELATIVE_UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: 'year', ms: 365.2425 * 86_400_000 },
  { unit: 'month', ms: (365.2425 / 12) * 86_400_000 },
  { unit: 'week', ms: 7 * 86_400_000 },
  { unit: 'day', ms: 86_400_000 },
  { unit: 'hour', ms: 3_600_000 },
  { unit: 'minute', ms: 60_000 },
]

/** "3 hours ago" / "in 12 min" style relative label, given `nowMs`. */
export function formatRelative(ms: number, nowMs: number): string {
  const diff = ms - nowMs
  if (Math.abs(diff) < 1000) return 'just now'
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const { unit, ms: unitMs } of RELATIVE_UNITS) {
    if (Math.abs(diff) >= unitMs) {
      return rtf.format(Math.round(diff / unitMs), unit)
    }
  }
  return rtf.format(Math.round(diff / 1000), 'second')
}

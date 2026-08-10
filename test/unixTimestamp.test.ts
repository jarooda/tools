import { describe, it, expect } from 'vitest'
import {
  parseTimestamp,
  formatTimestamp,
  msToDatetimeLocal,
  parseDatetimeLocal,
  formatIso8601,
  formatRfc2822Utc,
  formatRelative,
  MIN_DATE_MS,
  MAX_DATE_MS,
} from '@/utils/unixTimestamp'

describe('parseTimestamp', () => {
  it('parses seconds', () => {
    const r = parseTimestamp('1700000000', 'seconds')
    expect(r.ok).toBe(true)
    expect(r.ms).toBe(1_700_000_000_000)
  })

  it('parses milliseconds', () => {
    const r = parseTimestamp('1700000000000', 'milliseconds')
    expect(r.ok).toBe(true)
    expect(r.ms).toBe(1_700_000_000_000)
  })

  it('accepts a leading minus for pre-1970 dates', () => {
    const r = parseTimestamp('-100', 'seconds')
    expect(r.ok).toBe(true)
    expect(r.ms).toBe(-100_000)
  })

  it('rejects non-numeric input', () => {
    expect(parseTimestamp('abc', 'seconds').ok).toBe(false)
  })

  it('rejects decimals', () => {
    expect(parseTimestamp('1.5', 'seconds').ok).toBe(false)
  })

  it('rejects out-of-range values', () => {
    const tooLarge = String(MAX_DATE_MS / 1000 + 1)
    expect(parseTimestamp(tooLarge, 'seconds').ok).toBe(false)
    const tooSmall = String(MIN_DATE_MS / 1000 - 1)
    expect(parseTimestamp(tooSmall, 'seconds').ok).toBe(false)
  })
})

describe('formatTimestamp', () => {
  it('formats seconds and milliseconds', () => {
    expect(formatTimestamp(1_700_000_000_000, 'seconds')).toBe('1700000000')
    expect(formatTimestamp(1_700_000_000_000, 'milliseconds')).toBe('1700000000000')
  })
})

describe('msToDatetimeLocal / parseDatetimeLocal', () => {
  it('round-trips through UTC', () => {
    const ms = Date.UTC(2024, 0, 15, 12, 30, 45)
    const text = msToDatetimeLocal(ms, 'utc')
    expect(text).toBe('2024-01-15T12:30:45')
    expect(parseDatetimeLocal(text, 'utc')).toBe(ms)
  })

  it('returns null for malformed input', () => {
    expect(parseDatetimeLocal('not-a-date', 'utc')).toBeNull()
  })
})

describe('formatIso8601 / formatRfc2822Utc', () => {
  it('formats an instant as ISO 8601', () => {
    expect(formatIso8601(Date.UTC(2024, 0, 15, 12, 0, 0))).toBe('2024-01-15T12:00:00.000Z')
  })

  it('formats an instant as RFC 2822 (UTC)', () => {
    expect(formatRfc2822Utc(Date.UTC(2024, 0, 15, 12, 0, 0))).toBe('Mon, 15 Jan 2024 12:00:00 GMT')
  })
})

describe('formatRelative', () => {
  const now = Date.UTC(2024, 0, 15, 12, 0, 0)

  it('describes the past', () => {
    expect(formatRelative(now - 3 * 3_600_000, now)).toBe('3 hours ago')
  })

  it('describes the future', () => {
    expect(formatRelative(now + 12 * 60_000, now)).toBe('in 12 minutes')
  })

  it('treats sub-second differences as "just now"', () => {
    expect(formatRelative(now + 500, now)).toBe('just now')
  })
})

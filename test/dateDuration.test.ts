import { describe, it, expect } from 'vitest'
import {
  calendarBreakdown,
  totalDays,
  totalWeeks,
  totalMonthsApprox,
  totalYearsApprox,
  totalHours,
  totalMinutes,
  totalSeconds,
  isSameInstant,
  isReversed,
  formatCalendarBreakdown,
  parseDateOnly,
  parseDateTimeLocal,
  formatDateOnly,
  formatDateTimeLocal,
} from '@/utils/dateDuration'

describe('parseDateOnly / formatDateOnly', () => {
  it('round-trips a date-only value', () => {
    const ms = parseDateOnly('2024-03-15')!
    expect(ms).not.toBeNull()
    expect(formatDateOnly(ms)).toBe('2024-03-15')
  })

  it('returns null for malformed input', () => {
    expect(parseDateOnly('not-a-date')).toBeNull()
    expect(parseDateOnly('')).toBeNull()
  })
})

describe('parseDateTimeLocal / formatDateTimeLocal', () => {
  it('round-trips a datetime-local value', () => {
    const ms = parseDateTimeLocal('2024-03-15T14:30')!
    expect(ms).not.toBeNull()
    expect(formatDateTimeLocal(ms)).toBe('2024-03-15T14:30')
  })

  it('returns null for malformed input', () => {
    expect(parseDateTimeLocal('2024-03-15')).toBeNull()
  })
})

describe('calendarBreakdown', () => {
  it('computes a normal range', () => {
    const start = parseDateOnly('2024-01-01')!
    const end = parseDateOnly('2025-03-11')!
    const b = calendarBreakdown(start, end)
    expect(b).toEqual({ years: 1, months: 2, days: 10 })
  })

  it('returns zero breakdown for the same day', () => {
    const ms = parseDateOnly('2024-06-15')!
    expect(calendarBreakdown(ms, ms)).toEqual({ years: 0, months: 0, days: 0 })
  })

  it('returns zero breakdown for the same moment', () => {
    const ms = parseDateTimeLocal('2024-06-15T10:00')!
    expect(calendarBreakdown(ms, ms)).toEqual({ years: 0, months: 0, days: 0 })
  })

  it('is unaffected by argument order (unsigned magnitude)', () => {
    const start = parseDateOnly('2024-01-01')!
    const end = parseDateOnly('2024-04-10')!
    expect(calendarBreakdown(start, end)).toEqual(calendarBreakdown(end, start))
  })

  it('handles leap years correctly', () => {
    const start = parseDateOnly('2024-02-28')!
    const end = parseDateOnly('2024-03-01')!
    expect(calendarBreakdown(start, end)).toEqual({ years: 0, months: 0, days: 2 })
  })

  it('handles a range spanning a leap day', () => {
    const start = parseDateOnly('2020-02-01')!
    const end = parseDateOnly('2021-02-01')!
    expect(calendarBreakdown(start, end)).toEqual({ years: 1, months: 0, days: 0 })
  })

  it('handles a DST-crossing range with UTC-anchored day counting (no ±1 shift)', () => {
    // US DST spring-forward: 2024-03-10. A UTC-anchored calendar breakdown
    // must count this as exactly 1 day regardless of local-time DST rules.
    const start = parseDateOnly('2024-03-09')!
    const end = parseDateOnly('2024-03-10')!
    expect(calendarBreakdown(start, end)).toEqual({ years: 0, months: 0, days: 1 })
    expect(totalDays(start, end)).toBe(1)
  })

  it('handles huge ranges (years apart)', () => {
    const start = parseDateOnly('1990-06-15')!
    const end = parseDateOnly('2026-08-10')!
    const b = calendarBreakdown(start, end)
    expect(b.years).toBe(36)
    expect(b.months).toBe(1)
    expect(b.days).toBe(26)
  })
})

describe('isSameInstant / isReversed', () => {
  it('detects the same instant', () => {
    const ms = parseDateOnly('2024-01-01')!
    expect(isSameInstant(ms, ms)).toBe(true)
    expect(isSameInstant(ms, ms + 1)).toBe(false)
  })

  it('detects reversed order', () => {
    const start = parseDateOnly('2024-06-01')!
    const end = parseDateOnly('2024-01-01')!
    expect(isReversed(start, end)).toBe(true)
    expect(isReversed(end, start)).toBe(false)
  })
})

describe('total* conversions', () => {
  it('computes total days/weeks/months/years for a normal range', () => {
    const start = parseDateOnly('2024-01-01')!
    const end = parseDateOnly('2024-01-08')!
    expect(totalDays(start, end)).toBe(7)
    expect(totalWeeks(start, end)).toBe(1)
  })

  it('computes ms-derived totals regardless of argument order', () => {
    const start = parseDateOnly('2024-01-01')!
    const end = parseDateOnly('2024-06-01')!
    expect(totalDays(start, end)).toBe(totalDays(end, start))
    expect(totalMonthsApprox(start, end)).toBeCloseTo(totalMonthsApprox(end, start))
    expect(totalYearsApprox(start, end)).toBeCloseTo(totalYearsApprox(end, start))
  })

  it('computes hours/minutes/seconds from the raw ms difference', () => {
    const start = parseDateTimeLocal('2024-01-01T00:00')!
    const end = parseDateTimeLocal('2024-01-02T00:00')!
    expect(totalHours(start, end)).toBe(24)
    expect(totalMinutes(start, end)).toBe(1440)
    expect(totalSeconds(start, end)).toBe(86_400)
  })

  it('lets calendar days and ms-derived hours disagree across a DST transition', () => {
    // Local DST changes don't affect our UTC-anchored math directly, but this
    // documents the expected relationship: a 1-calendar-day span is always
    // exactly 24 ms-derived hours here, since everything is UTC-anchored.
    const start = parseDateTimeLocal('2024-03-09T12:00')!
    const end = parseDateTimeLocal('2024-03-10T12:00')!
    expect(calendarBreakdown(start, end)).toEqual({ years: 0, months: 0, days: 1 })
    expect(totalHours(start, end)).toBe(24)
  })
})

describe('formatCalendarBreakdown', () => {
  it('formats a full breakdown', () => {
    expect(formatCalendarBreakdown({ years: 1, months: 2, days: 10 })).toBe(
      '1 year, 2 months, 10 days',
    )
  })

  it('omits zero-value units', () => {
    expect(formatCalendarBreakdown({ years: 0, months: 3, days: 0 })).toBe('3 months')
    expect(formatCalendarBreakdown({ years: 2, months: 0, days: 0 })).toBe('2 years')
  })

  it('shows "0 days" when everything is zero', () => {
    expect(formatCalendarBreakdown({ years: 0, months: 0, days: 0 })).toBe('0 days')
  })

  it('uses singular units correctly', () => {
    expect(formatCalendarBreakdown({ years: 1, months: 1, days: 1 })).toBe('1 year, 1 month, 1 day')
  })
})

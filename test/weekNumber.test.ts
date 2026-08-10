import { describe, it, expect } from 'vitest'
import { parseDateOnly } from '@/utils/dateDuration'
import {
  isoWeek,
  usWeek,
  dayOfYear,
  daysRemainingInYear,
  quarter,
  isIsoYearBoundary,
} from '@/utils/weekNumber'

function ms(date: string): number {
  return parseDateOnly(date)!
}

describe('isoWeek', () => {
  it('Jan 1, 2027 -> ISO week 53, 2026 (boundary case)', () => {
    expect(isoWeek(ms('2027-01-01'))).toEqual({ week: 53, isoYear: 2026 })
  })

  it('Dec 31, 2024 -> ISO week 1, 2025 (Tuesday, boundary the other direction)', () => {
    expect(isoWeek(ms('2024-12-31'))).toEqual({ week: 1, isoYear: 2025 })
  })

  it('Jan 1, 2023 -> ISO week 52, 2022 (Sunday, boundary case)', () => {
    expect(isoWeek(ms('2023-01-01'))).toEqual({ week: 52, isoYear: 2022 })
  })

  it('handles normal mid-year dates', () => {
    expect(isoWeek(ms('2024-07-15'))).toEqual({ week: 29, isoYear: 2024 })
    expect(isoWeek(ms('2026-06-15'))).toEqual({ week: 25, isoYear: 2026 })
  })
})

describe('usWeek', () => {
  it('Jan 1, 2027 -> US week 1, 2027', () => {
    expect(usWeek(ms('2027-01-01'))).toEqual({ week: 1, year: 2027 })
  })

  it('Dec 31, 2024 -> US week 53, 2024', () => {
    expect(usWeek(ms('2024-12-31'))).toEqual({ week: 53, year: 2024 })
  })

  it('Jan 1, 2023 -> US week 1, 2023', () => {
    expect(usWeek(ms('2023-01-01'))).toEqual({ week: 1, year: 2023 })
  })

  it('handles normal mid-year dates', () => {
    expect(usWeek(ms('2024-07-15'))).toEqual({ week: 29, year: 2024 })
    expect(usWeek(ms('2026-06-15'))).toEqual({ week: 25, year: 2026 })
  })
})

describe('dayOfYear', () => {
  it('Jan 1 -> 1', () => {
    expect(dayOfYear(ms('2024-01-01'))).toBe(1)
  })

  it('handles a leap year Feb 29 -> 60', () => {
    expect(dayOfYear(ms('2024-02-29'))).toBe(60)
  })

  it('Dec 31 of a non-leap year -> 365', () => {
    expect(dayOfYear(ms('2023-12-31'))).toBe(365)
  })

  it('Dec 31 of a leap year -> 366', () => {
    expect(dayOfYear(ms('2024-12-31'))).toBe(366)
  })
})

describe('daysRemainingInYear', () => {
  it('Dec 31 -> 0', () => {
    expect(daysRemainingInYear(ms('2024-12-31'))).toBe(0)
  })

  it('Jan 1 of a non-leap year -> 364', () => {
    expect(daysRemainingInYear(ms('2023-01-01'))).toBe(364)
  })

  it('Jan 1 of a leap year -> 365', () => {
    expect(daysRemainingInYear(ms('2024-01-01'))).toBe(365)
  })
})

describe('quarter', () => {
  it('maps months to quarters', () => {
    expect(quarter(ms('2024-01-15'))).toBe(1)
    expect(quarter(ms('2024-03-31'))).toBe(1)
    expect(quarter(ms('2024-04-01'))).toBe(2)
    expect(quarter(ms('2024-06-30'))).toBe(2)
    expect(quarter(ms('2024-07-01'))).toBe(3)
    expect(quarter(ms('2024-09-30'))).toBe(3)
    expect(quarter(ms('2024-10-01'))).toBe(4)
    expect(quarter(ms('2024-12-31'))).toBe(4)
  })
})

describe('isIsoYearBoundary', () => {
  it('is true for Jan 1, 2027 (ISO week 53 of 2026)', () => {
    expect(isIsoYearBoundary(ms('2027-01-01'))).toBe(true)
  })

  it('is true for Dec 31, 2024 (ISO week 1 of 2025)', () => {
    expect(isIsoYearBoundary(ms('2024-12-31'))).toBe(true)
  })

  it('is true for Jan 1, 2023 (ISO week 52 of 2022)', () => {
    expect(isIsoYearBoundary(ms('2023-01-01'))).toBe(true)
  })

  it('is false for a normal mid-year date', () => {
    expect(isIsoYearBoundary(ms('2024-07-15'))).toBe(false)
  })

  it('is false when Jan 1 falls in ISO week 1 of the same year', () => {
    expect(isIsoYearBoundary(ms('2024-01-01'))).toBe(false)
  })
})

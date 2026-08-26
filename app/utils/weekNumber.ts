/**
 * Week number / calendar-position helpers — pure, DOM-free logic (unit-tested
 * in `test/`). UTC-anchored like `dateDuration.ts`, so a DST transition can
 * never silently shift a date-only calculation by ±1 day.
 */

const DAY_MS = 86_400_000

export interface IsoWeek {
  /** 1-53, ISO 8601 week number. */
  week: number
  /** ISO week-numbering year — can differ from the calendar year. */
  isoYear: number
}

export interface UsWeek {
  /** 1-53, Sunday-start, week 1 = the week containing Jan 1. */
  week: number
  /** Always the calendar year of the input date. */
  year: number
}

/** The UTC-midnight Thursday of the ISO week containing `ms`. */
function isoThursday(ms: number): Date {
  const d = new Date(ms)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  return d
}

/** ISO 8601 week number and week-numbering year for a UTC-anchored instant. */
export function isoWeek(ms: number): IsoWeek {
  const thursday = isoThursday(ms)
  const isoYear = thursday.getUTCFullYear()

  const jan4 = Date.UTC(isoYear, 0, 4)
  const week1Thursday = isoThursday(jan4)

  const week = 1 + Math.round((thursday.getTime() - week1Thursday.getTime()) / (7 * DAY_MS))

  return { week, isoYear }
}

/** US-convention week number (Sunday-start, week 1 contains Jan 1). */
export function usWeek(ms: number): UsWeek {
  const d = new Date(ms)
  const year = d.getUTCFullYear()
  const jan1Weekday = new Date(Date.UTC(year, 0, 1)).getUTCDay()
  const week = Math.ceil((dayOfYear(ms) + jan1Weekday) / 7)
  return { week, year }
}

/** 1-based day of year; Jan 1 -> 1. */
export function dayOfYear(ms: number): number {
  const d = new Date(ms)
  const year = d.getUTCFullYear()
  const startOfYear = Date.UTC(year, 0, 1)
  return Math.round((ms - startOfYear) / DAY_MS) + 1
}

/** Days remaining until (and including up to) Dec 31 of the same year; Dec 31 -> 0. */
export function daysRemainingInYear(ms: number): number {
  const d = new Date(ms)
  const year = d.getUTCFullYear()
  const endOfYear = Date.UTC(year, 11, 31)
  return Math.round((endOfYear - ms) / DAY_MS)
}

/** Calendar quarter, 1-4. */
export function quarter(ms: number): number {
  const month = new Date(ms).getUTCMonth()
  return Math.floor(month / 3) + 1
}

/** True when the ISO week-numbering year differs from the calendar year. */
export function isIsoYearBoundary(ms: number): boolean {
  return isoWeek(ms).isoYear !== new Date(ms).getUTCFullYear()
}

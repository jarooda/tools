import { describe, it, expect } from 'vitest'
import { parseDateOnly, formatDateOnly } from '@/utils/dateDuration'
import {
  isWeekend,
  isHoliday,
  isBusinessDay,
  countBusinessDays,
  addBusinessDays,
  excludedDaysInRange,
  type WeekdayIndex,
  type BusinessDaysOptions,
} from '@/utils/businessDays'

const WEEKENDS_SAT_SUN: ReadonlySet<WeekdayIndex> = new Set([6, 7])
const ALL_DAYS_WEEKEND: ReadonlySet<WeekdayIndex> = new Set([1, 2, 3, 4, 5, 6, 7])

function d(value: string): number {
  return parseDateOnly(value)!
}

function opts(holidays: string[] = [], weekendDays = WEEKENDS_SAT_SUN): BusinessDaysOptions {
  return { weekendDays, holidays: new Set(holidays.map((h) => d(h))) }
}

describe('isWeekend / isHoliday / isBusinessDay', () => {
  it('flags Sat/Sun as weekend under the default weekend set', () => {
    expect(isWeekend(d('2024-06-15'), WEEKENDS_SAT_SUN)).toBe(true) // Sat
    expect(isWeekend(d('2024-06-16'), WEEKENDS_SAT_SUN)).toBe(true) // Sun
    expect(isWeekend(d('2024-06-17'), WEEKENDS_SAT_SUN)).toBe(false) // Mon
  })

  it('flags a date in the holiday set', () => {
    const holidays = new Set([d('2024-12-25')])
    expect(isHoliday(d('2024-12-25'), holidays)).toBe(true)
    expect(isHoliday(d('2024-12-24'), holidays)).toBe(false)
  })

  it('a business day is neither weekend nor holiday', () => {
    const o = opts(['2024-06-17'])
    expect(isBusinessDay(d('2024-06-17'), o)).toBe(false) // holiday
    expect(isBusinessDay(d('2024-06-15'), o)).toBe(false) // weekend
    expect(isBusinessDay(d('2024-06-18'), o)).toBe(true)
  })
})

describe('countBusinessDays', () => {
  it('counts a normal range excluding weekends', () => {
    // Mon 2024-06-17 .. Fri 2024-06-21 = 5 business days
    expect(countBusinessDays(d('2024-06-17'), d('2024-06-21'), opts())).toBe(5)
    // Mon .. next Mon (2024-06-24) spans one weekend = 6 business days
    expect(countBusinessDays(d('2024-06-17'), d('2024-06-24'), opts())).toBe(6)
  })

  it('excludes holidays from the count', () => {
    const o = opts(['2024-06-19'])
    expect(countBusinessDays(d('2024-06-17'), d('2024-06-21'), o)).toBe(4)
  })

  it('is unsigned/order-independent for a reversed range', () => {
    const forward = countBusinessDays(d('2024-06-17'), d('2024-06-21'), opts())
    const reversed = countBusinessDays(d('2024-06-21'), d('2024-06-17'), opts())
    expect(reversed).toBe(forward)
  })

  it('returns 0 when every day of the week is a weekend', () => {
    expect(countBusinessDays(d('2024-06-17'), d('2024-06-21'), opts([], ALL_DAYS_WEEKEND))).toBe(0)
  })
})

describe('addBusinessDays', () => {
  it('n=0 is an identity operation', () => {
    expect(addBusinessDays(d('2024-06-17'), 0, opts())).toBe(d('2024-06-17'))
  })

  it('n=0 is an identity operation even when start is a weekend', () => {
    // 2024-06-15 is a Saturday
    expect(addBusinessDays(d('2024-06-15'), 0, opts())).toBe(d('2024-06-15'))
  })

  it('adds positive business days, skipping weekends', () => {
    // Mon 2024-06-17 + 5 business days = Mon 2024-06-24
    const result = addBusinessDays(d('2024-06-17'), 5, opts())
    expect(formatDateOnly(result!)).toBe('2024-06-24')
  })

  it('subtracts negative business days, skipping weekends', () => {
    // Mon 2024-06-24 - 5 business days = Mon 2024-06-17
    const result = addBusinessDays(d('2024-06-24'), -5, opts())
    expect(formatDateOnly(result!)).toBe('2024-06-17')
  })

  it('starts counting from the next business day when start is a weekend', () => {
    // Sat 2024-06-15 + 1 business day = Mon 2024-06-17 (start not counted)
    const result = addBusinessDays(d('2024-06-15'), 1, opts())
    expect(formatDateOnly(result!)).toBe('2024-06-17')
  })

  it('starts counting from the previous business day when start is a weekend (negative n)', () => {
    // Sun 2024-06-16 - 1 business day = Fri 2024-06-14 (start not counted)
    const result = addBusinessDays(d('2024-06-16'), -1, opts())
    expect(formatDateOnly(result!)).toBe('2024-06-14')
  })

  it('starts counting from the next business day when start is a holiday', () => {
    const o = opts(['2024-06-17'])
    // Mon 2024-06-17 is a holiday; +1 business day = Tue 2024-06-18
    const result = addBusinessDays(d('2024-06-17'), 1, o)
    expect(formatDateOnly(result!)).toBe('2024-06-18')
  })

  it('returns null when every day of the week is a weekend', () => {
    expect(addBusinessDays(d('2024-06-17'), 3, opts([], ALL_DAYS_WEEKEND))).toBeNull()
  })
})

describe('excludedDaysInRange', () => {
  it('lists weekend and holiday dates with reasons', () => {
    const o = opts(['2024-06-19'])
    const excluded = excludedDaysInRange(d('2024-06-17'), d('2024-06-24'), o)
    expect(excluded).toEqual([
      { dateMs: d('2024-06-19'), reason: 'holiday' },
      { dateMs: d('2024-06-22'), reason: 'weekend' },
      { dateMs: d('2024-06-23'), reason: 'weekend' },
    ])
  })

  it('returns an empty list when nothing is excluded', () => {
    expect(excludedDaysInRange(d('2024-06-17'), d('2024-06-18'), opts())).toEqual([])
  })
})

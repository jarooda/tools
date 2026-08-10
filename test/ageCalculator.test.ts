import { describe, it, expect } from 'vitest'
import { parseDateOnly, calendarBreakdown, formatCalendarBreakdown } from '@/utils/dateDuration'
import { weekdayName, nextBirthday, isFutureBirth } from '@/utils/ageCalculator'

describe('weekdayName', () => {
  it('names the correct weekday', () => {
    expect(weekdayName(parseDateOnly('2024-01-01')!)).toBe('Monday')
    expect(weekdayName(parseDateOnly('2024-01-02')!)).toBe('Tuesday')
    expect(weekdayName(parseDateOnly('2024-01-07')!)).toBe('Sunday')
  })
})

describe('isFutureBirth', () => {
  it('flags a birth date after the as-of date', () => {
    const birth = parseDateOnly('2030-01-01')!
    const asOf = parseDateOnly('2024-01-01')!
    expect(isFutureBirth(birth, asOf)).toBe(true)
  })

  it('does not flag a birth date on or before the as-of date', () => {
    const birth = parseDateOnly('2000-01-01')!
    const asOf = parseDateOnly('2024-01-01')!
    expect(isFutureBirth(birth, asOf)).toBe(false)
    expect(isFutureBirth(asOf, asOf)).toBe(false)
  })
})

describe('age via calendarBreakdown', () => {
  it('computes a normal age', () => {
    const birth = parseDateOnly('1996-04-01')!
    const asOf = parseDateOnly('2024-06-15')!
    const breakdown = calendarBreakdown(birth, asOf)
    expect(breakdown).toEqual({ years: 28, months: 2, days: 14 })
    expect(formatCalendarBreakdown(breakdown)).toBe('28 years, 2 months, 14 days')
  })

  it('is age 0 on the same day (birth = as-of)', () => {
    const ms = parseDateOnly('2024-06-15')!
    const breakdown = calendarBreakdown(ms, ms)
    expect(breakdown).toEqual({ years: 0, months: 0, days: 0 })
  })
})

describe('nextBirthday', () => {
  it('finds the next occurrence later this year', () => {
    const birth = parseDateOnly('1996-08-20')!
    const asOf = parseDateOnly('2024-06-15')!
    const result = nextBirthday(birth, asOf)
    expect(result.dateMs).toBe(parseDateOnly('2024-08-20')!)
    expect(result.turningAge).toBe(28)
    expect(result.isToday).toBe(false)
    expect(result.leapDayObserved).toBe(false)
    expect(result.daysUntil).toBe(66)
  })

  it('rolls over to next year when this year’s birthday has passed', () => {
    const birth = parseDateOnly('1996-03-01')!
    const asOf = parseDateOnly('2024-06-15')!
    const result = nextBirthday(birth, asOf)
    expect(result.dateMs).toBe(parseDateOnly('2025-03-01')!)
    expect(result.turningAge).toBe(29)
  })

  it('resolves Feb 29 births to Feb 28 in a non-leap observed year', () => {
    const birth = parseDateOnly('2000-02-29')!
    const asOf = parseDateOnly('2025-01-01')!
    const result = nextBirthday(birth, asOf)
    expect(result.dateMs).toBe(parseDateOnly('2025-02-28')!)
    expect(result.leapDayObserved).toBe(true)
    expect(result.turningAge).toBe(25)
  })

  it('resolves Feb 29 births to Feb 29 in a leap observed year', () => {
    const birth = parseDateOnly('2000-02-29')!
    const asOf = parseDateOnly('2024-01-01')!
    const result = nextBirthday(birth, asOf)
    expect(result.dateMs).toBe(parseDateOnly('2024-02-29')!)
    expect(result.leapDayObserved).toBe(false)
    expect(result.turningAge).toBe(24)
  })

  it('reports isToday and the correct turning age when the birthday is today', () => {
    const birth = parseDateOnly('1996-06-15')!
    const asOf = parseDateOnly('2024-06-15')!
    const result = nextBirthday(birth, asOf)
    expect(result.isToday).toBe(true)
    expect(result.daysUntil).toBe(0)
    expect(result.turningAge).toBe(28)
    expect(result.dateMs).toBe(asOf)
  })
})

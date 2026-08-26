/**
 * Business-day arithmetic — pure, DOM-free logic (unit-tested in `test/`).
 * Every date is a UTC-anchored epoch-ms timestamp at midnight (`Date.UTC`),
 * matching `dateDuration.ts`'s convention, so a DST transition can never
 * silently shift a day count by ±1.
 */

const DAY_MS = 86_400_000

/** ISO weekday index: 1=Monday .. 7=Sunday. */
export type WeekdayIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7

/** UTC-midnight ms timestamps of holiday dates. */
export type HolidaySet = ReadonlySet<number>

export interface BusinessDaysOptions {
  weekendDays: ReadonlySet<WeekdayIndex>
  holidays: HolidaySet
}

/** ISO weekday (1=Mon..7=Sun) of a UTC-midnight ms timestamp. */
function isoWeekday(dateMs: number): WeekdayIndex {
  const jsDay = new Date(dateMs).getUTCDay() // 0=Sun..6=Sat
  return (jsDay === 0 ? 7 : jsDay) as WeekdayIndex
}

export function isWeekend(dateMs: number, weekendDays: ReadonlySet<WeekdayIndex>): boolean {
  return weekendDays.has(isoWeekday(dateMs))
}

export function isHoliday(dateMs: number, holidays: HolidaySet): boolean {
  return holidays.has(dateMs)
}

export function isBusinessDay(dateMs: number, options: BusinessDaysOptions): boolean {
  return !isWeekend(dateMs, options.weekendDays) && !isHoliday(dateMs, options.holidays)
}

/**
 * Count of business days in `[startMs, endMs]`, inclusive of both endpoints
 * if they are business days. Unsigned/order-independent — the caller is
 * responsible for captioning a reversed range.
 */
export function countBusinessDays(
  startMs: number,
  endMs: number,
  options: BusinessDaysOptions,
): number {
  const lo = Math.min(startMs, endMs)
  const hi = Math.max(startMs, endMs)
  let count = 0
  for (let d = lo; d <= hi; d += DAY_MS) {
    if (isBusinessDay(d, options)) count++
  }
  return count
}

/**
 * Resulting UTC-midnight date after adding (or subtracting, if `n < 0`) `n`
 * business days from `startMs`. If `startMs` is not itself a business day,
 * counting begins from the next (or previous, for negative `n`) business
 * day — `startMs` is NOT counted as day zero. `n = 0` always returns
 * `startMs` unchanged (identity operation), even if `startMs` is a
 * weekend/holiday — no forward-rolling. Returns `null` if `weekendDays`
 * covers all 7 days (no business day exists).
 */
export function addBusinessDays(
  startMs: number,
  n: number,
  options: BusinessDaysOptions,
): number | null {
  if (n === 0) return startMs
  if (options.weekendDays.size >= 7) return null

  const step = n > 0 ? DAY_MS : -DAY_MS
  let remaining = Math.abs(n)
  let current = startMs

  while (remaining > 0) {
    current += step
    if (isBusinessDay(current, options)) remaining--
  }

  return current
}

/** Excluded dates within `[startMs, endMs]` with reason, for a breakdown table. */
export function excludedDaysInRange(
  startMs: number,
  endMs: number,
  options: BusinessDaysOptions,
): Array<{ dateMs: number; reason: 'weekend' | 'holiday' }> {
  const lo = Math.min(startMs, endMs)
  const hi = Math.max(startMs, endMs)
  const result: Array<{ dateMs: number; reason: 'weekend' | 'holiday' }> = []

  for (let d = lo; d <= hi; d += DAY_MS) {
    if (isHoliday(d, options.holidays)) {
      result.push({ dateMs: d, reason: 'holiday' })
    } else if (isWeekend(d, options.weekendDays)) {
      result.push({ dateMs: d, reason: 'weekend' })
    }
  }

  return result
}

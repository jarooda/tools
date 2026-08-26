/**
 * Age-specific helpers layered on top of `dateDuration.ts`'s UTC-anchored
 * date math — nothing here duplicates calendar breakdown or totals, only the
 * bits that are unique to "age from a birth date" (next-birthday lookup,
 * weekday name, future-birth validation).
 */

const DAY_MS = 86_400_000
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export interface NextBirthday {
  /** UTC-anchored epoch ms of the next occurrence. */
  dateMs: number
  /** 0 when isToday. */
  daysUntil: number
  turningAge: number
  isToday: boolean
  /** True when birth is Feb 29 and this occurrence is Feb 28. */
  leapDayObserved: boolean
}

/** Weekday name for a UTC-anchored epoch ms value, e.g. "Tuesday". */
export function weekdayName(ms: number): string {
  return WEEKDAY_NAMES[new Date(ms).getUTCDay()]!
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * Next birthday on/after asOfMs, given a UTC-anchored birth date. Feb 29
 * births resolve to Feb 28 in non-leap observed years.
 */
export function nextBirthday(birthMs: number, asOfMs: number): NextBirthday {
  const birth = new Date(birthMs)
  const asOf = new Date(asOfMs)

  const birthMonth = birth.getUTCMonth()
  const birthDay = birth.getUTCDate()
  const isLeapDayBirth = birthMonth === 1 && birthDay === 29

  const asOfYear = asOf.getUTCFullYear()

  function occurrenceInYear(year: number): { dateMs: number; leapDayObserved: boolean } {
    if (isLeapDayBirth && !isLeapYear(year)) {
      return { dateMs: Date.UTC(year, 1, 28), leapDayObserved: true }
    }
    return { dateMs: Date.UTC(year, birthMonth, birthDay), leapDayObserved: false }
  }

  let occurrence = occurrenceInYear(asOfYear)
  let turningAge = asOfYear - birth.getUTCFullYear()

  if (occurrence.dateMs < asOfMs) {
    occurrence = occurrenceInYear(asOfYear + 1)
    turningAge += 1
  }

  const isToday = occurrence.dateMs === asOfMs
  const daysUntil = isToday ? 0 : Math.round((occurrence.dateMs - asOfMs) / DAY_MS)

  return {
    dateMs: occurrence.dateMs,
    daysUntil,
    turningAge,
    isToday,
    leapDayObserved: occurrence.leapDayObserved,
  }
}

/** True when birthMs is strictly after asOfMs (invalid — future birth). */
export function isFutureBirth(birthMs: number, asOfMs: number): boolean {
  return birthMs > asOfMs
}

/**
 * Cron expression parser, explainer, and next-run finder — pure, DOM-free
 * logic (unit-tested in `test/`). Hand-rolled (no `cron-parser`/`cronstrue`)
 * since we only need standard 5-field cron support and local-time math,
 * which native `Date` already handles correctly, including DST.
 */

export interface CronFieldMatcher {
  /** Raw token as typed, e.g. `1-5,10-15/2`. */
  raw: string
  /** True when the field is unrestricted (`*`). */
  isWildcard: boolean
  matches: (value: number) => boolean
}

export interface CronFields {
  minute: CronFieldMatcher
  hour: CronFieldMatcher
  dayOfMonth: CronFieldMatcher
  month: CronFieldMatcher
  dayOfWeek: CronFieldMatcher
}

export interface CronParseResult {
  ok: boolean
  fields?: CronFields
  error?: string
}

const MONTH_NAMES = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
]
const DOW_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

const MONTH_FULL_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const DOW_FULL_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const FIELD_DEFS = [
  { key: 'minute', label: 'Minute', min: 0, max: 59, names: undefined },
  { key: 'hour', label: 'Hour', min: 0, max: 23, names: undefined },
  { key: 'dayOfMonth', label: 'Day of month', min: 1, max: 31, names: undefined },
  { key: 'month', label: 'Month', min: 1, max: 12, names: MONTH_NAMES },
  { key: 'dayOfWeek', label: 'Day of week', min: 0, max: 6, names: DOW_NAMES },
] as const

type FieldKey = (typeof FIELD_DEFS)[number]['key']

function resolveToken(token: string, names: readonly string[] | undefined): number | null {
  const upper = token.toUpperCase()
  if (names) {
    const idx = names.indexOf(upper)
    if (idx !== -1) return idx + (names === MONTH_NAMES ? 1 : 0)
  }
  if (!/^\d+$/.test(token)) return null
  return Number(token)
}

/** Parse a single field's raw token (e.g. `1-5,10-15/2`) into a matcher. */
function parseField(
  raw: string,
  min: number,
  max: number,
  label: string,
  names: readonly string[] | undefined,
): { matcher: CronFieldMatcher; error?: string } {
  if (raw === '*') {
    return { matcher: { raw, isWildcard: true, matches: () => true } }
  }

  const allowed = new Set<number>()
  const parts = raw.split(',')
  for (const part of parts) {
    if (part === '') {
      return { matcher: dummyMatcher(raw), error: `${label} has an empty entry.` }
    }

    let rangePart = part
    let step = 1
    const stepMatch = /^(.*)\/(\d+)$/.exec(part)
    if (stepMatch) {
      rangePart = stepMatch[1]!
      step = Number(stepMatch[2])
      if (step <= 0) {
        return { matcher: dummyMatcher(raw), error: `${label} step must be a positive number.` }
      }
    }

    let rangeMin: number
    let rangeMax: number
    if (rangePart === '*') {
      rangeMin = min
      rangeMax = max
    } else if (rangePart.includes('-')) {
      const [fromRaw, toRaw] = rangePart.split('-')
      if (fromRaw === undefined || toRaw === undefined || toRaw === '') {
        return { matcher: dummyMatcher(raw), error: `${label} has a malformed range "${part}".` }
      }
      const from = resolveToken(fromRaw, names)
      const to = resolveToken(toRaw, names)
      if (from === null || to === null) {
        return { matcher: dummyMatcher(raw), error: `${label} has a malformed range "${part}".` }
      }
      if (from < min || from > max || to < min || to > max) {
        return {
          matcher: dummyMatcher(raw),
          error: `${label} must be between ${min} and ${max}.`,
        }
      }
      if (from > to) {
        return {
          matcher: dummyMatcher(raw),
          error: `${label} range "${part}" is invalid (start must be ≤ end).`,
        }
      }
      rangeMin = from
      rangeMax = to
    } else {
      const value = resolveToken(rangePart, names)
      if (value === null) {
        return { matcher: dummyMatcher(raw), error: `${label} has an invalid value "${part}".` }
      }
      if (value < min || value > max) {
        return {
          matcher: dummyMatcher(raw),
          error: `${label} must be between ${min} and ${max}.`,
        }
      }
      rangeMin = value
      rangeMax = value
    }

    for (let v = rangeMin; v <= rangeMax; v += step) allowed.add(v)
  }

  return { matcher: { raw, isWildcard: false, matches: (v) => allowed.has(v) } }
}

function dummyMatcher(raw: string): CronFieldMatcher {
  return { raw, isWildcard: false, matches: () => false }
}

/** Parse a 5-field cron expression. Never throws. */
export function parseCronExpression(expr: string): CronParseResult {
  const trimmed = expr.trim()
  if (trimmed === '') return { ok: false, error: 'Enter a cron expression.' }

  const tokens = trimmed.split(/\s+/)
  if (tokens.length !== 5) {
    return {
      ok: false,
      error: `A cron expression needs exactly 5 fields (minute hour day-of-month month day-of-week), got ${tokens.length}.`,
    }
  }

  const parsed: Partial<Record<FieldKey, CronFieldMatcher>> = {}
  for (let i = 0; i < FIELD_DEFS.length; i++) {
    const def = FIELD_DEFS[i]!
    const { matcher, error } = parseField(tokens[i]!, def.min, def.max, def.label, def.names)
    if (error) return { ok: false, error }
    parsed[def.key] = matcher
  }

  return {
    ok: true,
    fields: parsed as CronFields,
  }
}

function listValues(matcher: CronFieldMatcher, min: number, max: number): number[] {
  const values: number[] = []
  for (let v = min; v <= max; v++) if (matcher.matches(v)) values.push(v)
  return values
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Compress a sorted list of ints into "1, 2, 3" or "1-5" style ranges. */
function describeRanges(values: number[], names?: readonly string[]): string {
  if (values.length === 0) return 'none'
  const label = (v: number) => (names ? names[names === MONTH_FULL_NAMES ? v - 1 : v] : String(v))
  const ranges: string[] = []
  let start = values[0]!
  let prev = values[0]!
  for (let i = 1; i <= values.length; i++) {
    const v = values[i]
    if (v !== undefined && v === prev + 1) {
      prev = v
      continue
    }
    ranges.push(start === prev ? label(start) : `${label(start)} through ${label(prev)}`)
    if (v !== undefined) {
      start = v
      prev = v
    }
  }
  if (ranges.length === 1) return ranges[0]!
  if (ranges.length === 2) return ranges.join(' and ')
  return `${ranges.slice(0, -1).join(', ')}, and ${ranges[ranges.length - 1]}`
}

/** Produce one plain-English sentence describing the schedule. Deterministic. */
export function explainCron(fields: CronFields): string {
  const { minute, hour, dayOfMonth, month, dayOfWeek } = fields

  let timePart: string
  if (minute.isWildcard && hour.isWildcard) {
    timePart = 'Every minute'
  } else if (!minute.isWildcard && hour.isWildcard) {
    const minutes = listValues(minute, 0, 59)
    timePart =
      minutes.length === 1 && minutes[0] === 0
        ? 'At the top of every hour'
        : `At minute ${describeRanges(minutes)} of every hour`
  } else if (minute.isWildcard && !hour.isWildcard) {
    const hours = listValues(hour, 0, 23)
    timePart = `Every minute during hour ${describeRanges(hours)}`
  } else {
    const minutes = listValues(minute, 0, 59)
    const hours = listValues(hour, 0, 23)
    if (minutes.length === 1 && hours.length === 1) {
      timePart = `At ${pad2(hours[0]!)}:${pad2(minutes[0]!)}`
    } else {
      const times: string[] = []
      for (const h of hours) for (const m of minutes) times.push(`${pad2(h)}:${pad2(m)}`)
      timePart = times.length <= 4 ? `At ${times.join(', ')}` : `At ${times.length} times per day`
    }
  }

  const domRestricted = !dayOfMonth.isWildcard
  const dowRestricted = !dayOfWeek.isWildcard

  let dayPart = ''
  if (domRestricted && dowRestricted) {
    const doms = listValues(dayOfMonth, 1, 31)
    const dows = listValues(dayOfWeek, 0, 6)
    dayPart = `on day ${describeRanges(doms)} of the month, or ${describeRanges(dows, DOW_FULL_NAMES)}`
  } else if (domRestricted) {
    const doms = listValues(dayOfMonth, 1, 31)
    dayPart = `on day ${describeRanges(doms)} of the month`
  } else if (dowRestricted) {
    const dows = listValues(dayOfWeek, 0, 6)
    dayPart = describeRanges(dows, DOW_FULL_NAMES)
  }

  let monthPart = ''
  if (!month.isWildcard) {
    const months = listValues(month, 1, 12)
    monthPart = `in ${describeRanges(months, MONTH_FULL_NAMES)}`
  }

  const parts = [timePart, dayPart, monthPart].filter(Boolean)
  return `${parts.join(', ')}.`
}

/** True if `date`'s wall-clock fields still match the intended matchers (guards DST gaps). */
function candidateMatches(date: Date, fields: CronFields): boolean {
  const minute = date.getMinutes()
  const hour = date.getHours()
  const dom = date.getDate()
  const month = date.getMonth() + 1
  const dow = date.getDay()

  if (!fields.minute.matches(minute)) return false
  if (!fields.hour.matches(hour)) return false
  if (!fields.month.matches(month)) return false

  const domRestricted = !fields.dayOfMonth.isWildcard
  const dowRestricted = !fields.dayOfWeek.isWildcard
  if (domRestricted && dowRestricted) {
    if (!fields.dayOfMonth.matches(dom) && !fields.dayOfWeek.matches(dow)) return false
  } else if (domRestricted) {
    if (!fields.dayOfMonth.matches(dom)) return false
  } else if (dowRestricted) {
    if (!fields.dayOfWeek.matches(dow)) return false
  }

  return true
}

/**
 * Walk forward minute-by-minute from `from` looking for up to `count` matching
 * moments, capped at `horizonYears` to avoid hanging on impossible expressions
 * (e.g. day-of-month 31 in February). Never throws — returns whatever was
 * found, possibly fewer than `count`, even zero.
 */
export function nextCronRuns(
  fields: CronFields,
  from: Date,
  count: number,
  horizonYears = 4,
): Date[] {
  if (count <= 0) return []

  // Track intended wall-clock fields explicitly (not via a mutated Date) so a
  // DST spring-forward gap can be detected: constructing `new Date(...)` for a
  // nonexistent local time (e.g. 02:30 on the day clocks jump 02:00 -> 03:00)
  // silently resolves to a *different* instant, whose getHours()/getMinutes()
  // won't match what we asked for. We just skip those candidates and keep
  // marching our own logical clock forward — Date's overflow normalization
  // still does the heavy lifting for month/day/year rollover.
  let year = from.getFullYear()
  let month = from.getMonth() + 1
  let day = from.getDate()
  let hour = from.getHours()
  let minute = from.getMinutes() + 1
  if (minute >= 60) {
    minute = 0
    hour++
  }
  if (hour >= 24) {
    hour = 0
    day++
  }

  const deadline = new Date(year, month - 1, day, hour, minute)
  deadline.setFullYear(deadline.getFullYear() + horizonYears)

  const results: Date[] = []
  for (;;) {
    const candidate = new Date(year, month - 1, day, hour, minute)
    if (candidate > deadline || results.length >= count) break

    if (
      candidate.getHours() === hour &&
      candidate.getMinutes() === minute &&
      candidateMatches(candidate, fields)
    ) {
      results.push(candidate)
    }

    minute++
    if (minute >= 60) {
      minute = 0
      hour++
    }
    if (hour >= 24) {
      hour = 0
      day++
    }
  }

  return results
}

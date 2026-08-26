import { describe, it, expect } from 'vitest'
import { parseCronExpression, explainCron, nextCronRuns } from '@/utils/cron'

function parseOk(expr: string) {
  const r = parseCronExpression(expr)
  expect(r.ok).toBe(true)
  return r.fields!
}

describe('parseCronExpression', () => {
  it('parses a basic expression', () => {
    const r = parseCronExpression('0 9 * * MON-FRI')
    expect(r.ok).toBe(true)
    expect(r.fields!.minute.matches(0)).toBe(true)
    expect(r.fields!.minute.matches(1)).toBe(false)
    expect(r.fields!.hour.matches(9)).toBe(true)
    expect(r.fields!.dayOfMonth.isWildcard).toBe(true)
    expect(r.fields!.month.isWildcard).toBe(true)
    expect(r.fields!.dayOfWeek.matches(1)).toBe(true) // Monday
    expect(r.fields!.dayOfWeek.matches(0)).toBe(false) // Sunday
  })

  it('treats * as a wildcard matching everything', () => {
    const fields = parseOk('* * * * *')
    expect(fields.minute.isWildcard).toBe(true)
    for (let m = 0; m <= 59; m++) expect(fields.minute.matches(m)).toBe(true)
  })

  it('parses comma-separated lists', () => {
    const fields = parseOk('0,15,30,45 * * * *')
    expect(fields.minute.matches(0)).toBe(true)
    expect(fields.minute.matches(15)).toBe(true)
    expect(fields.minute.matches(20)).toBe(false)
  })

  it('parses ranges', () => {
    const fields = parseOk('* 9-17 * * *')
    expect(fields.hour.matches(9)).toBe(true)
    expect(fields.hour.matches(17)).toBe(true)
    expect(fields.hour.matches(8)).toBe(false)
    expect(fields.hour.matches(18)).toBe(false)
  })

  it('parses step values', () => {
    const fields = parseOk('*/15 * * * *')
    expect(fields.minute.matches(0)).toBe(true)
    expect(fields.minute.matches(15)).toBe(true)
    expect(fields.minute.matches(30)).toBe(true)
    expect(fields.minute.matches(45)).toBe(true)
    expect(fields.minute.matches(10)).toBe(false)
  })

  it('parses combined range + step expressions', () => {
    const fields = parseOk('1-5,10-15/2 * * * *')
    expect(fields.minute.matches(1)).toBe(true)
    expect(fields.minute.matches(5)).toBe(true)
    expect(fields.minute.matches(10)).toBe(true)
    expect(fields.minute.matches(12)).toBe(true)
    expect(fields.minute.matches(11)).toBe(false)
    expect(fields.minute.matches(6)).toBe(false)
  })

  it('parses month and day-of-week names case-insensitively', () => {
    const fields = parseOk('0 0 1 jan,DEC sun')
    expect(fields.month.matches(1)).toBe(true)
    expect(fields.month.matches(12)).toBe(true)
    expect(fields.month.matches(6)).toBe(false)
    expect(fields.dayOfWeek.matches(0)).toBe(true)
    expect(fields.dayOfWeek.matches(1)).toBe(false)
  })

  it('rejects out-of-range values', () => {
    expect(parseCronExpression('60 * * * *').ok).toBe(false)
    expect(parseCronExpression('* 24 * * *').ok).toBe(false)
    expect(parseCronExpression('* * 32 * *').ok).toBe(false)
    expect(parseCronExpression('* * * 13 *').ok).toBe(false)
    expect(parseCronExpression('* * * * 7').ok).toBe(false)
  })

  it('rejects a malformed range', () => {
    const r = parseCronExpression('5-1 * * * *')
    expect(r.ok).toBe(false)
    expect(r.error).toBeTruthy()
  })

  it('rejects the wrong number of tokens', () => {
    expect(parseCronExpression('* * * *').ok).toBe(false)
    expect(parseCronExpression('* * * * * *').ok).toBe(false)
  })

  it('rejects garbage input', () => {
    expect(parseCronExpression('not a cron').ok).toBe(false)
    expect(parseCronExpression('').ok).toBe(false)
    expect(parseCronExpression('   ').ok).toBe(false)
  })

  it('never throws on malformed input', () => {
    expect(() => parseCronExpression('a/b-c,,*')).not.toThrow()
  })
})

describe('POSIX day-of-month/day-of-week OR rule', () => {
  it('matches when EITHER dom or dow matches if both are restricted', () => {
    // 15th of the month OR any Monday.
    const fields = parseOk('0 0 15 * MON')
    // Monday 2026-08-03 (not the 15th) — should still match via dow.
    expect(nextCronRuns(fields, new Date(2026, 7, 2, 23, 59), 1)[0]?.getDate()).toBe(3)
  })

  it('only requires the single restricted field when the other is wildcard', () => {
    const fields = parseOk('0 0 15 * *')
    const runs = nextCronRuns(fields, new Date(2026, 0, 1), 1)
    expect(runs[0]?.getDate()).toBe(15)
  })
})

describe('explainCron', () => {
  it('describes a simple weekday schedule', () => {
    const fields = parseOk('0 9 * * MON-FRI')
    expect(explainCron(fields)).toBe('At 09:00, Monday through Friday.')
  })

  it('describes every minute', () => {
    const fields = parseOk('* * * * *')
    expect(explainCron(fields)).toBe('Every minute.')
  })

  it('describes a monthly schedule', () => {
    const fields = parseOk('0 0 1 * *')
    expect(explainCron(fields)).toBe('At 00:00, on day 1 of the month.')
  })
})

describe('nextCronRuns', () => {
  it('finds the correct next runs for a daily schedule', () => {
    const fields = parseOk('0 9 * * *')
    const runs = nextCronRuns(fields, new Date(2026, 7, 9, 10, 0), 3)
    expect(runs).toHaveLength(3)
    expect(runs[0]).toEqual(new Date(2026, 7, 10, 9, 0))
    expect(runs[1]).toEqual(new Date(2026, 7, 11, 9, 0))
    expect(runs[2]).toEqual(new Date(2026, 7, 12, 9, 0))
  })

  it('finds the correct next runs for weekdays at 9am', () => {
    const fields = parseOk('0 9 * * MON-FRI')
    // 2026-08-07 is a Friday.
    const runs = nextCronRuns(fields, new Date(2026, 7, 7, 9, 30), 2)
    expect(runs[0]).toEqual(new Date(2026, 7, 10, 9, 0)) // Monday
    expect(runs[1]).toEqual(new Date(2026, 7, 11, 9, 0)) // Tuesday
  })

  it('respects the count and horizon caps', () => {
    const fields = parseOk('* * * * *')
    const runs = nextCronRuns(fields, new Date(2026, 0, 1), 10)
    expect(runs).toHaveLength(10)
  })

  it('returns an empty array when no run exists in the horizon (Feb 31)', () => {
    const fields = parseOk('0 0 31 2 *')
    const runs = nextCronRuns(fields, new Date(2026, 0, 1), 5, 4)
    expect(runs).toEqual([])
  })

  it('skips a nonexistent DST spring-forward wall-clock time', () => {
    // US DST 2026 spring-forward: 2026-03-08, clocks jump 02:00 -> 03:00 local.
    // A schedule targeting 02:30 should not appear on that date.
    const originalTz = process.env.TZ
    process.env.TZ = 'America/New_York'
    try {
      const fields = parseOk('30 2 * * *')
      const runs = nextCronRuns(fields, new Date(2026, 2, 7, 0, 0), 2)
      const dates = runs.map((d) => d.getDate())
      expect(dates).not.toContain(8)
      expect(dates).toEqual([7, 9])
    } finally {
      process.env.TZ = originalTz
    }
  })
})

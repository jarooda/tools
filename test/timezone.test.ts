import { describe, it, expect } from 'vitest'
import {
  zoneOffsetMs,
  zonedTimeToUtc,
  formatInZone,
  convertZones,
  TIME_ZONES,
} from '@/utils/timezone'

const HOUR = 3600_000

describe('zoneOffsetMs', () => {
  it('is zero for UTC', () => {
    expect(zoneOffsetMs(Date.UTC(2024, 0, 15, 12), 'UTC')).toBe(0)
  })

  it('reflects standard vs daylight time in New York', () => {
    // Mid-January: EST = UTC-5
    expect(zoneOffsetMs(Date.UTC(2024, 0, 15, 12), 'America/New_York')).toBe(-5 * HOUR)
    // Mid-July: EDT = UTC-4
    expect(zoneOffsetMs(Date.UTC(2024, 6, 15, 12), 'America/New_York')).toBe(-4 * HOUR)
  })

  it('handles a half-hour zone (Kolkata = UTC+5:30)', () => {
    expect(zoneOffsetMs(Date.UTC(2024, 0, 15, 12), 'Asia/Kolkata')).toBe(5.5 * HOUR)
  })
})

describe('zonedTimeToUtc', () => {
  it('interprets wall-clock time in the given zone', () => {
    // 07:00 in New York on 2024-01-15 is 12:00 UTC.
    const instant = zonedTimeToUtc(2024, 1, 15, 7, 0, 'America/New_York')
    expect(instant).toBe(Date.UTC(2024, 0, 15, 12, 0))
  })

  it('round-trips a UTC wall-clock time to the same instant', () => {
    const instant = zonedTimeToUtc(2024, 6, 1, 9, 30, 'UTC')
    expect(instant).toBe(Date.UTC(2024, 5, 1, 9, 30))
  })
})

describe('formatInZone', () => {
  it('formats an instant in a target zone', () => {
    const instant = Date.UTC(2024, 0, 15, 12, 0)
    const tokyo = formatInZone(instant, { id: 'Asia/Tokyo', label: 'Tokyo' })
    expect(tokyo.time).toBe('21:00') // UTC+9
    expect(tokyo.offset).toMatch(/GMT\+9/)
  })
})

describe('convertZones', () => {
  it('produces a row per zone and a shared instant', () => {
    const { instant, results } = convertZones(2024, 1, 15, 12, 0, 'UTC')
    expect(instant).toBe(Date.UTC(2024, 0, 15, 12, 0))
    expect(results).toHaveLength(TIME_ZONES.length)
    expect(results.find((r) => r.id === 'UTC')!.time).toBe('12:00')
    expect(results.find((r) => r.id === 'America/Los_Angeles')!.time).toBe('04:00')
  })
})

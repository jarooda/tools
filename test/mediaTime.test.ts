import { describe, expect, it } from 'vitest'
import { clampTimeRange, formatClock, formatTimecode, parseTimecode } from '@/utils/mediaTime'

describe('formatTimecode', () => {
  it('formats seconds as HH:MM:SS.mmm', () => {
    expect(formatTimecode(0)).toBe('00:00:00.000')
    expect(formatTimecode(9.25)).toBe('00:00:09.250')
    expect(formatTimecode(3723.5)).toBe('01:02:03.500')
  })

  it('carries rounded milliseconds into the next second', () => {
    expect(formatTimecode(1.9996)).toBe('00:00:02.000')
  })

  it('collapses negative and non-finite input to zero', () => {
    expect(formatTimecode(-5)).toBe('00:00:00.000')
    expect(formatTimecode(Number.NaN)).toBe('00:00:00.000')
    expect(formatTimecode(Number.POSITIVE_INFINITY)).toBe('00:00:00.000')
  })
})

describe('formatClock', () => {
  it('omits the hour segment below an hour', () => {
    expect(formatClock(9.4)).toBe('0:09')
    expect(formatClock(75)).toBe('1:15')
  })

  it('includes hours once the duration reaches one', () => {
    expect(formatClock(3723)).toBe('1:02:03')
  })

  it('treats invalid durations as zero', () => {
    expect(formatClock(Number.NaN)).toBe('0:00')
    expect(formatClock(-3)).toBe('0:00')
  })
})

describe('parseTimecode', () => {
  it('parses seconds, MM:SS, and HH:MM:SS', () => {
    expect(parseTimecode('12')).toBe(12)
    expect(parseTimecode('1:30')).toBe(90)
    expect(parseTimecode('01:02:03')).toBe(3723)
  })

  it('accepts fractional seconds and surrounding whitespace', () => {
    expect(parseTimecode(' 0:02.5 ')).toBe(2.5)
  })

  it('rejects unparseable input', () => {
    expect(parseTimecode('')).toBeNull()
    expect(parseTimecode('abc')).toBeNull()
    expect(parseTimecode('1:2:3:4')).toBeNull()
    expect(parseTimecode('1:-2')).toBeNull()
  })
})

describe('clampTimeRange', () => {
  it('keeps the range inside the duration', () => {
    expect(clampTimeRange(-2, 99, 60)).toEqual({ start: 0, end: 60 })
  })

  it('never lets the end fall before the start', () => {
    expect(clampTimeRange(30, 10, 60)).toEqual({ start: 30, end: 30 })
  })

  it('collapses to zero for an unknown duration', () => {
    expect(clampTimeRange(5, 10, 0)).toEqual({ start: 0, end: 0 })
    expect(clampTimeRange(5, 10, Number.NaN)).toEqual({ start: 0, end: 0 })
  })
})

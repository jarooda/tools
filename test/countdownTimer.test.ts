import { describe, it, expect } from 'vitest'
import {
  computeElapsedMs,
  computeRemainingMs,
  msFromParts,
  formatCountdownClock,
  formatDurationWords,
} from '@/utils/countdownTimer'

describe('computeElapsedMs', () => {
  it('returns accumulatedMs when not running', () => {
    expect(computeElapsedMs(5000, null, 999_999)).toBe(5000)
  })

  it('adds the delta since startTimestamp when running', () => {
    expect(computeElapsedMs(2000, 1000, 4500)).toBe(2000 + 3500)
  })

  it('self-corrects after a throttled tick (large now delta) without drift', () => {
    // Simulates a backgrounded tab: only one tick fires, but the elapsed time
    // is recomputed fresh from the timestamps, not accumulated per-tick.
    const start = 1000
    const now = start + 45_000
    expect(computeElapsedMs(0, start, now)).toBe(45_000)
  })

  it('never goes negative if now is somehow before startTimestamp', () => {
    expect(computeElapsedMs(1000, 5000, 4000)).toBe(1000)
  })
})

describe('pause/resume accumulation', () => {
  it('carries accumulated time correctly across multiple pause/resume cycles', () => {
    // Run 1: 0 -> 3000ms
    let accumulated = 0
    let elapsed = computeElapsedMs(accumulated, 0, 3000)
    expect(elapsed).toBe(3000)

    // Pause: freeze accumulated at elapsed
    accumulated = elapsed

    // Run 2 (resume at t=10000): 10000 -> 12500
    elapsed = computeElapsedMs(accumulated, 10_000, 12_500)
    expect(elapsed).toBe(3000 + 2500)

    // Pause again
    accumulated = elapsed

    // Run 3 (resume at t=20000): 20000 -> 20800
    elapsed = computeElapsedMs(accumulated, 20_000, 20_800)
    expect(elapsed).toBe(5500 + 800)
  })
})

describe('computeRemainingMs', () => {
  it('subtracts elapsed from target', () => {
    expect(computeRemainingMs(10_000, 4000)).toBe(6000)
  })

  it('clamps to 0 once elapsed reaches or exceeds target', () => {
    expect(computeRemainingMs(10_000, 10_000)).toBe(0)
    expect(computeRemainingMs(10_000, 15_000)).toBe(0)
  })

  it('clamps to target when elapsed is negative', () => {
    expect(computeRemainingMs(10_000, -500)).toBe(10_000)
  })
})

describe('msFromParts', () => {
  it('combines hours/minutes/seconds into ms', () => {
    expect(msFromParts(1, 2, 3)).toBe(3_600_000 + 120_000 + 3000)
  })

  it('clamps negative parts to zero', () => {
    expect(msFromParts(-1, 5, -3)).toBe(300_000)
  })
})

describe('formatCountdownClock', () => {
  it('formats sub-hour durations as MM:SS', () => {
    expect(formatCountdownClock(65_000)).toBe('01:05')
    expect(formatCountdownClock(0)).toBe('00:00')
  })

  it('formats durations of an hour or more as H:MM:SS', () => {
    expect(formatCountdownClock(3_661_000)).toBe('1:01:01')
  })
})

describe('formatDurationWords', () => {
  it('omits zero-value units except when the whole duration is zero', () => {
    expect(formatDurationWords(0)).toBe('0 seconds')
    expect(formatDurationWords(60_000)).toBe('1 minute')
    expect(formatDurationWords(300_000)).toBe('5 minutes')
  })

  it('combines minutes and seconds', () => {
    expect(formatDurationWords(192_000)).toBe('3 minutes 12 seconds')
  })

  it('includes hours when present', () => {
    expect(formatDurationWords(3_725_000)).toBe('1 hour 2 minutes 5 seconds')
  })
})

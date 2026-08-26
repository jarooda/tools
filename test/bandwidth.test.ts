import { describe, it, expect } from 'vitest'
import { calcDownloadSeconds, humanizeDuration } from '@/utils/bandwidth'

const approx = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

describe('calcDownloadSeconds', () => {
  it('100 MB over 100 Mbps ≈ 8 seconds', () => {
    // 100 MB = 100e6 B = 800e6 bit; 100 Mbps = 100e6 bit/s → 8s
    expect(approx(calcDownloadSeconds(100, 'MB', 100, 'Mbps')!, 8)).toBe(true)
  })

  it('1 GB over 1 Gbps ≈ 8 seconds', () => {
    expect(approx(calcDownloadSeconds(1, 'GB', 1, 'Gbps')!, 8)).toBe(true)
  })

  it('handles each size unit', () => {
    expect(approx(calcDownloadSeconds(1, 'KB', 8, 'Kbps')!, 1)).toBe(true)
    expect(approx(calcDownloadSeconds(1, 'MB', 8, 'Mbps')!, 1)).toBe(true)
    expect(approx(calcDownloadSeconds(1, 'GB', 8, 'Gbps')!, 1)).toBe(true)
    // 1 TB = 1e12 B = 8e12 bit; at 1 Gbps (1e9 bit/s) → 8000s
    expect(approx(calcDownloadSeconds(1, 'TB', 1, 'Gbps')!, 8000)).toBe(true)
  })

  it('handles each speed unit', () => {
    // 1 MB = 1e6 B = 8e6 bit
    expect(approx(calcDownloadSeconds(1, 'MB', 8000, 'Kbps')!, 1)).toBe(true)
    expect(approx(calcDownloadSeconds(1, 'MB', 8, 'Mbps')!, 1)).toBe(true)
    expect(approx(calcDownloadSeconds(1, 'MB', 0.008, 'Gbps')!, 1)).toBe(true)
  })

  it('56 Kbps dial-up downloading 1 MB takes a while', () => {
    // 1 MB = 8e6 bit; 56 Kbps = 56000 bit/s → ~142.857s
    expect(approx(calcDownloadSeconds(1, 'MB', 56, 'Kbps')!, 8e6 / 56000)).toBe(true)
  })

  it('returns null for zero or negative size', () => {
    expect(calcDownloadSeconds(0, 'MB', 100, 'Mbps')).toBeNull()
    expect(calcDownloadSeconds(-5, 'MB', 100, 'Mbps')).toBeNull()
  })

  it('returns null for zero or negative speed', () => {
    expect(calcDownloadSeconds(100, 'MB', 0, 'Mbps')).toBeNull()
    expect(calcDownloadSeconds(100, 'MB', -1, 'Mbps')).toBeNull()
  })

  it('returns null for non-finite inputs', () => {
    expect(calcDownloadSeconds(NaN, 'MB', 100, 'Mbps')).toBeNull()
    expect(calcDownloadSeconds(100, 'MB', Infinity, 'Mbps')).toBeNull()
    expect(calcDownloadSeconds(Infinity, 'MB', 100, 'Mbps')).toBeNull()
  })
})

describe('humanizeDuration', () => {
  it('formats seconds only', () => {
    expect(humanizeDuration(0)).toBe('0 sec')
    expect(humanizeDuration(45)).toBe('45 sec')
    expect(humanizeDuration(59)).toBe('59 sec')
  })

  it('formats minutes and seconds', () => {
    expect(humanizeDuration(60)).toBe('1 min')
    expect(humanizeDuration(154)).toBe('2 min 34 sec')
    expect(humanizeDuration(3599)).toBe('59 min 59 sec')
  })

  it('formats hours and minutes', () => {
    expect(humanizeDuration(3600)).toBe('1 hr')
    expect(humanizeDuration(11520)).toBe('3 hr 12 min')
  })

  it('handles very large durations (dial-up downloading a large file)', () => {
    // ~39.68 hours
    expect(humanizeDuration(142857)).toBe('39 hr 40 min')
  })

  it('never returns a negative duration', () => {
    expect(humanizeDuration(-10)).toBe('0 sec')
  })
})

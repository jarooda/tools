import { describe, it, expect } from 'vitest'
import { formatBytes, percentSmaller } from '@/utils/fileSize'

describe('formatBytes', () => {
  it('formats bytes, KB, MB', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })

  it('drops decimals once the value is large', () => {
    expect(formatBytes(20 * 1024)).toBe('20 KB')
  })

  it('returns empty for invalid input', () => {
    expect(formatBytes(-1)).toBe('')
    expect(formatBytes(NaN)).toBe('')
  })
})

describe('percentSmaller', () => {
  it('reports shrink as positive', () => {
    expect(percentSmaller(1000, 250)).toBe(75)
  })

  it('reports growth as negative', () => {
    expect(percentSmaller(1000, 1200)).toBe(-20)
  })

  it('guards against a zero baseline', () => {
    expect(percentSmaller(0, 100)).toBe(0)
  })
})

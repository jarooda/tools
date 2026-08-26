import { describe, it, expect } from 'vitest'
import { parseNumberList, computeStatistics } from '@/utils/statistics'

describe('parseNumberList', () => {
  it('parses comma-separated numbers', () => {
    expect(parseNumberList('1,2,3')).toEqual({ values: [1, 2, 3], invalidTokens: [] })
  })

  it('parses space-separated numbers', () => {
    expect(parseNumberList('1 2 3')).toEqual({ values: [1, 2, 3], invalidTokens: [] })
  })

  it('parses newline-separated numbers', () => {
    expect(parseNumberList('1\n2\n3')).toEqual({ values: [1, 2, 3], invalidTokens: [] })
  })

  it('parses a mix of commas, spaces, and newlines', () => {
    expect(parseNumberList('1, 2\n3,   4\n\n5')).toEqual({
      values: [1, 2, 3, 4, 5],
      invalidTokens: [],
    })
  })

  it('ignores empty tokens from repeated separators', () => {
    expect(parseNumberList('1,,2,  ,3')).toEqual({ values: [1, 2, 3], invalidTokens: [] })
  })

  it('returns empty results for empty input', () => {
    expect(parseNumberList('')).toEqual({ values: [], invalidTokens: [] })
    expect(parseNumberList('   \n  ')).toEqual({ values: [], invalidTokens: [] })
  })

  it('collects invalid tokens separately from valid numbers', () => {
    expect(parseNumberList('1, abc, 2, N/A, 3')).toEqual({
      values: [1, 2, 3],
      invalidTokens: ['abc', 'N/A'],
    })
  })

  it('parses negative numbers and decimals', () => {
    expect(parseNumberList('-1.5, 2.25, -3')).toEqual({
      values: [-1.5, 2.25, -3],
      invalidTokens: [],
    })
  })

  it('treats a purely non-numeric input as all invalid tokens', () => {
    expect(parseNumberList('a b c')).toEqual({ values: [], invalidTokens: ['a', 'b', 'c'] })
  })
})

describe('computeStatistics', () => {
  it('handles a single value', () => {
    const result = computeStatistics([7])
    expect(result.count).toBe(1)
    expect(result.sum).toBe(7)
    expect(result.mean).toBe(7)
    expect(result.median).toBe(7)
    expect(result.mode).toEqual([])
    expect(result.min).toBe(7)
    expect(result.max).toBe(7)
    expect(result.range).toBe(0)
    expect(result.varPopulation).toBe(0)
    expect(result.varSample).toBeNull()
    expect(result.stdevPopulation).toBe(0)
    expect(result.stdevSample).toBeNull()
    expect(result.q1).toBe(7)
    expect(result.q3).toBe(7)
    expect(result.iqr).toBe(0)
  })

  it('handles all-identical values', () => {
    const result = computeStatistics([3, 3, 3, 3])
    expect(result.count).toBe(4)
    expect(result.mean).toBe(3)
    expect(result.median).toBe(3)
    expect(result.mode).toEqual([3])
    expect(result.varPopulation).toBe(0)
    expect(result.varSample).toBe(0)
    expect(result.stdevPopulation).toBe(0)
    expect(result.stdevSample).toBe(0)
    expect(result.q1).toBe(3)
    expect(result.q3).toBe(3)
    expect(result.iqr).toBe(0)
  })

  it('matches a hand-verified reference dataset', () => {
    // [2, 4, 4, 4, 5, 5, 7, 9]
    const result = computeStatistics([9, 4, 5, 2, 4, 7, 5, 4])

    expect(result.count).toBe(8)
    expect(result.sum).toBe(40)
    expect(result.mean).toBe(5)
    expect(result.median).toBe(4.5)
    expect(result.mode).toEqual([4])
    expect(result.min).toBe(2)
    expect(result.max).toBe(9)
    expect(result.range).toBe(7)
    expect(result.varPopulation).toBeCloseTo(4, 10)
    expect(result.varSample).toBeCloseTo(32 / 7, 10)
    expect(result.stdevPopulation).toBeCloseTo(2, 10)
    expect(result.stdevSample).toBeCloseTo(Math.sqrt(32 / 7), 10)
    expect(result.q1).toBeCloseTo(4, 10)
    expect(result.q3).toBeCloseTo(5.5, 10)
    expect(result.iqr).toBeCloseTo(1.5, 10)
  })

  it('returns all tied values when there is a multi-way mode', () => {
    const result = computeStatistics([1, 1, 2, 2, 3])
    expect(result.mode).toEqual([1, 2])
  })

  it('computes an odd-length median as the middle element', () => {
    const result = computeStatistics([5, 1, 3])
    expect(result.median).toBe(3)
  })
})

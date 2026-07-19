import { describe, it, expect } from 'vitest'
import { wrapLines } from '@/utils/memeText'

// Simple measure: one unit per character.
const measure = (s: string) => s.length

describe('wrapLines', () => {
  it('returns no lines for empty input', () => {
    expect(wrapLines('', 10, measure)).toEqual([])
    expect(wrapLines('   ', 10, measure)).toEqual([])
  })

  it('keeps short text on one line', () => {
    expect(wrapLines('hi there', 20, measure)).toEqual(['hi there'])
  })

  it('wraps greedily by word', () => {
    expect(wrapLines('hello world foo bar', 11, measure)).toEqual(['hello world', 'foo bar'])
  })

  it('gives an over-long word its own line', () => {
    expect(wrapLines('supercalifragilistic ok', 8, measure)).toEqual(['supercalifragilistic', 'ok'])
  })

  it('collapses extra whitespace', () => {
    expect(wrapLines('a   b', 10, measure)).toEqual(['a b'])
  })
})

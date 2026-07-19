import { describe, it, expect } from 'vitest'
import { computeTextStats, formatReadingTime } from '@/utils/textStats'

describe('computeTextStats', () => {
  it('returns all zeros for empty input', () => {
    const s = computeTextStats('')
    expect(s).toEqual({
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      sentences: 0,
      lines: 0,
      paragraphs: 0,
      readingSeconds: 0,
    })
  })

  it('counts characters with and without spaces', () => {
    const s = computeTextStats('a b c')
    expect(s.characters).toBe(5)
    expect(s.charactersNoSpaces).toBe(3)
  })

  it('counts words ignoring extra whitespace', () => {
    expect(computeTextStats('  hello   world  ').words).toBe(2)
    expect(computeTextStats('one\ntwo\tthree').words).toBe(3)
  })

  it('counts sentences by terminal punctuation', () => {
    expect(computeTextStats('Hi there. How are you? Great!').sentences).toBe(3)
    // Trailing text without punctuation still counts.
    expect(computeTextStats('One. Two').sentences).toBe(2)
    expect(computeTextStats('No terminator here').sentences).toBe(1)
  })

  it('counts lines and paragraphs', () => {
    const text = 'Line one\nLine two\n\nSecond paragraph'
    const s = computeTextStats(text)
    expect(s.lines).toBe(4)
    expect(s.paragraphs).toBe(2)
  })

  it('estimates reading time from word count', () => {
    // 200 words at 200 wpm ≈ 60s.
    const text = Array.from({ length: 200 }, () => 'word').join(' ')
    expect(computeTextStats(text).readingSeconds).toBe(60)
  })

  it('counts astral characters as one', () => {
    expect(computeTextStats('😀').characters).toBe(1)
  })
})

describe('formatReadingTime', () => {
  it('formats seconds and minutes', () => {
    expect(formatReadingTime(12)).toBe('12 sec')
    expect(formatReadingTime(60)).toBe('1 min')
    expect(formatReadingTime(65)).toBe('1 min 5 sec')
  })
})

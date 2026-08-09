import { describe, it, expect } from 'vitest'
import {
  diffLines,
  diffStats,
  diffTokens,
  diffWords,
  diffSideBySide,
  DIFF_MAX_LINES,
} from '@/utils/textDiff'

describe('diffLines', () => {
  it('marks identical text as all equal', () => {
    const rows = diffLines('a\nb\nc', 'a\nb\nc')
    expect(rows.every((r) => r.type === 'equal')).toBe(true)
    expect(rows).toHaveLength(3)
  })

  it('detects an added line', () => {
    const rows = diffLines('a\nc', 'a\nb\nc')
    expect(rows.map((r) => `${r.type}:${r.value}`)).toEqual(['equal:a', 'add:b', 'equal:c'])
  })

  it('detects a removed line', () => {
    const rows = diffLines('a\nb\nc', 'a\nc')
    expect(rows.map((r) => `${r.type}:${r.value}`)).toEqual(['equal:a', 'remove:b', 'equal:c'])
  })

  it('handles a changed line as remove + add', () => {
    const rows = diffLines('hello', 'world')
    expect(rows.map((r) => r.type).sort()).toEqual(['add', 'remove'])
  })

  it('tracks line numbers', () => {
    const rows = diffLines('a\nc', 'a\nb\nc')
    const add = rows.find((r) => r.type === 'add')!
    expect(add.bLine).toBe(2)
  })

  it('handles empty inputs', () => {
    expect(diffLines('', '')).toEqual([])
    expect(diffLines('', 'a').map((r) => r.type)).toEqual(['add'])
  })
})

describe('diffStats', () => {
  it('counts each type', () => {
    const rows = diffLines('a\nb\nc', 'a\nx\nc\nd')
    const s = diffStats(rows)
    expect(s.unchanged).toBe(2)
    expect(s.added).toBe(2)
    expect(s.removed).toBe(1)
  })
})

describe('diffTokens (generic core)', () => {
  it('produces the same line diff as diffLines when keyed by identity', () => {
    const a = ['a', 'b', 'c']
    const b = ['a', 'x', 'c', 'd']
    const rows = diffTokens(a, b, (s) => s)
    expect(rows.map((r) => `${r.type}:${r.value}`)).toEqual([
      'equal:a',
      'remove:b',
      'add:x',
      'equal:c',
      'add:d',
    ])
  })

  it('supports a custom key function (case-insensitive)', () => {
    const rows = diffTokens(['Hello'], ['hello'], (s) => s.toLowerCase())
    expect(rows).toEqual([{ type: 'equal', value: 'Hello', aIndex: 0, bIndex: 0 }])
  })
})

describe('diffWords', () => {
  it('detects a single word change', () => {
    const spans = diffWords('the quick fox', 'the slow fox')
    expect(spans).toEqual([
      { type: 'equal', text: 'the ' },
      { type: 'remove', text: 'quick' },
      { type: 'add', text: 'slow' },
      { type: 'equal', text: ' fox' },
    ])
  })

  it('detects a multi-word replace without char-mashing', () => {
    const spans = diffWords('hello world', 'goodbye there')
    expect(spans.filter((s) => s.type === 'remove').map((s) => s.text)).toEqual(['hello', 'world'])
    expect(spans.filter((s) => s.type === 'add').map((s) => s.text)).toEqual(['goodbye', 'there'])
    // no token is split mid-word — whole-word tokens only.
    expect(spans.some((s) => /^[a-z]+$/.test(s.text) === false && s.type !== 'equal')).toBe(false)
  })

  it('detects a whitespace-only difference', () => {
    const spans = diffWords('a  b', 'a b')
    expect(spans.some((s) => s.type !== 'equal')).toBe(true)
    const before = spans
      .filter((s) => s.type !== 'add')
      .map((s) => s.text)
      .join('')
    const after = spans
      .filter((s) => s.type !== 'remove')
      .map((s) => s.text)
      .join('')
    expect(before).toBe('a  b')
    expect(after).toBe('a b')
  })

  it('detects punctuation changes as their own tokens', () => {
    const spans = diffWords('hello, world', 'hello world')
    const removed = spans.filter((s) => s.type === 'remove').map((s) => s.text)
    expect(removed).toEqual([','])
  })

  it('reassembles losslessly for arbitrary text', () => {
    const a = "It's a test: (v1.0) — done!"
    const spans = diffWords(a, a)
    expect(spans.map((s) => s.text).join('')).toBe(a)
  })
})

describe('diffSideBySide', () => {
  it('aligns equal lines on both sides', () => {
    const { rows, wordLevel } = diffSideBySide('a\nb\nc', 'a\nb\nc')
    expect(wordLevel).toBe(true)
    expect(rows.every((r) => r.left.type === 'equal' && r.right.type === 'equal')).toBe(true)
  })

  it('gives replaced lines word-level spans on both sides', () => {
    const { rows } = diffSideBySide('the quick fox', 'the slow fox')
    expect(rows).toHaveLength(1)
    const [row] = rows
    expect(row!.left.type).toBe('remove')
    expect(row!.right.type).toBe('add')
    expect(row!.left.spans).toBeDefined()
    expect(row!.right.spans).toBeDefined()
    expect(row!.left.spans!.some((s) => s.type === 'remove')).toBe(true)
    expect(row!.right.spans!.some((s) => s.type === 'add')).toBe(true)
  })

  it('gives an unpaired pure add block full-line highlight only (no spans)', () => {
    const { rows } = diffSideBySide('a\nc', 'a\nb\nc')
    const addRow = rows.find((r) => r.right.type === 'add')!
    expect(addRow.left.type).toBe('filler')
    expect(addRow.right.spans).toBeUndefined()
  })

  it('gives an unpaired pure remove block full-line highlight only (no spans)', () => {
    const { rows } = diffSideBySide('a\nb\nc', 'a\nc')
    const removeRow = rows.find((r) => r.left.type === 'remove')!
    expect(removeRow.right.type).toBe('filler')
    expect(removeRow.left.spans).toBeUndefined()
  })

  it('pairs the shorter of a mismatched replace block, leaving the rest unpaired', () => {
    const { rows } = diffSideBySide('x\ny', 'a\nb\nc')
    const paired = rows.filter((r) => r.left.type === 'remove' && r.right.type === 'add')
    const fillerRight = rows.filter((r) => r.left.type === 'remove' && r.right.type === 'filler')
    const fillerLeft = rows.filter((r) => r.left.type === 'filler' && r.right.type === 'add')
    expect(paired).toHaveLength(2)
    expect(fillerRight).toHaveLength(0)
    expect(fillerLeft).toHaveLength(1)
  })

  it('respects the ignoreWhitespace option', () => {
    const withWhitespace = diffSideBySide('a\n  b  \nc', 'a\nb\nc')
    expect(withWhitespace.stats.unchanged).toBe(2)

    const ignored = diffSideBySide('a\n  b  \nc', 'a\nb\nc', { ignoreWhitespace: true })
    expect(ignored.stats.unchanged).toBe(3)
    expect(ignored.stats.added).toBe(0)
    expect(ignored.stats.removed).toBe(0)
  })

  it('falls back to line-level-only diffing for very large inputs (performance guard)', () => {
    const bigA = Array.from({ length: DIFF_MAX_LINES + 10 }, (_, i) => `line ${i}`).join('\n')
    const bigB = `${bigA}\nextra`
    const { wordLevel, rows } = diffSideBySide(bigA, bigB)
    expect(wordLevel).toBe(false)
    expect(rows.every((r) => r.left.spans === undefined && r.right.spans === undefined)).toBe(true)
  })
})

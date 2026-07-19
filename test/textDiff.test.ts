import { describe, it, expect } from 'vitest'
import { diffLines, diffStats } from '@/utils/textDiff'

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

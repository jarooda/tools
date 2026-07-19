import { describe, it, expect } from 'vitest'
import { transformLines } from '@/utils/lineTools'

describe('transformLines', () => {
  it('dedupes while preserving first-seen order', () => {
    const r = transformLines('a\nb\na\nc\nb', { dedupe: true })
    expect(r.lines).toEqual(['a', 'b', 'c'])
    expect(r.removed).toBe(2)
  })

  it('removes empty lines', () => {
    const r = transformLines('a\n\n\nb\n', { removeEmpty: true })
    expect(r.lines).toEqual(['a', 'b'])
  })

  it('trims whitespace on each line', () => {
    const r = transformLines('  a  \n\tb\t', { trim: true })
    expect(r.lines).toEqual(['a', 'b'])
  })

  it('sorts ascending and descending', () => {
    expect(transformLines('banana\napple\ncherry', { sort: 'asc' }).lines).toEqual([
      'apple',
      'banana',
      'cherry',
    ])
    expect(transformLines('banana\napple\ncherry', { sort: 'desc' }).lines).toEqual([
      'cherry',
      'banana',
      'apple',
    ])
  })

  it('sorts by length', () => {
    expect(transformLines('ccc\na\nbb', { sort: 'length' }).lines).toEqual(['a', 'bb', 'ccc'])
  })

  it('reverses line order', () => {
    expect(transformLines('a\nb\nc', { sort: 'reverse' }).lines).toEqual(['c', 'b', 'a'])
  })

  it('dedupes case-insensitively when requested', () => {
    const r = transformLines('Foo\nfoo\nFOO', { dedupe: true, ignoreCase: true })
    expect(r.lines).toEqual(['Foo'])
  })

  it('shuffles deterministically with an injected rng', () => {
    const r = transformLines('a\nb\nc', { sort: 'shuffle', rng: () => 0 })
    // rng()=0 always picks index 0 to swap with, giving a fixed permutation.
    expect(r.lines.sort()).toEqual(['a', 'b', 'c'])
    expect(r.lines).toHaveLength(3)
  })
})

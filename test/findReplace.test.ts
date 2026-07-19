import { describe, it, expect } from 'vitest'
import { applyFindReplace, escapeRegExp } from '@/utils/findReplace'

describe('escapeRegExp', () => {
  it('escapes regex metacharacters', () => {
    expect(escapeRegExp('a.b*c')).toBe('a\\.b\\*c')
  })
})

describe('applyFindReplace', () => {
  it('replaces plain text globally by default', () => {
    const r = applyFindReplace('a a a', { find: 'a', replace: 'b' })
    expect(r.output).toBe('b b b')
    expect(r.count).toBe(3)
  })

  it('is a no-op when find is empty', () => {
    expect(applyFindReplace('hello', { find: '', replace: 'x' })).toEqual({
      output: 'hello',
      count: 0,
    })
  })

  it('treats find literally in plain mode', () => {
    const r = applyFindReplace('a.b.c', { find: '.', replace: '-' })
    expect(r.output).toBe('a-b-c')
    expect(r.count).toBe(2)
  })

  it('supports case-insensitive matching', () => {
    const r = applyFindReplace('Hello HELLO', {
      find: 'hello',
      replace: 'x',
      caseInsensitive: true,
    })
    expect(r.output).toBe('x x')
    expect(r.count).toBe(2)
  })

  it('replaces only the first when global is off', () => {
    const r = applyFindReplace('a a', { find: 'a', replace: 'b', global: false })
    expect(r.output).toBe('b a')
    expect(r.count).toBe(1)
  })

  it('matches whole words only', () => {
    const r = applyFindReplace('cat category', { find: 'cat', replace: 'dog', wholeWord: true })
    expect(r.output).toBe('dog category')
    expect(r.count).toBe(1)
  })

  it('supports regex with backreferences', () => {
    const r = applyFindReplace('John Smith', {
      find: '(\\w+) (\\w+)',
      replace: '$2 $1',
      regex: true,
    })
    expect(r.output).toBe('Smith John')
    expect(r.count).toBe(1)
  })

  it('throws on an invalid regex', () => {
    expect(() => applyFindReplace('x', { find: '(', replace: '', regex: true })).toThrow()
  })
})

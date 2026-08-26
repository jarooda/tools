import { describe, it, expect } from 'vitest'
import { testRegex, explainPattern } from '@/utils/regexTest'

describe('testRegex', () => {
  it('finds a single match without the g flag', () => {
    const r = testRegex('cat', '', 'a cat sat on a cat')
    expect(r.error).toBeNull()
    expect(r.matches).toHaveLength(1)
    expect(r.matches[0]).toMatchObject({ match: 'cat', index: 2 })
  })

  it('finds every match with the g flag', () => {
    const r = testRegex('cat', 'g', 'a cat sat on a cat')
    expect(r.error).toBeNull()
    expect(r.matches).toHaveLength(2)
    expect(r.matches.map((m) => m.index)).toEqual([2, 15])
  })

  it('reports unnamed capture groups by position', () => {
    const r = testRegex('(\\d+)-(\\d+)', '', '12-34')
    expect(r.matches[0]!.groups).toEqual([
      { name: 1, value: '12' },
      { name: 2, value: '34' },
    ])
  })

  it('reports named capture groups by name', () => {
    const r = testRegex('(?<year>\\d{4})-(?<month>\\d{2})', '', '2026-08')
    expect(r.matches[0]!.groups).toEqual([
      { name: 'year', value: '2026' },
      { name: 'month', value: '08' },
    ])
  })

  it('returns an error for an invalid pattern', () => {
    const r = testRegex('[abc', '', 'text')
    expect(r.matches).toEqual([])
    expect(r.error).not.toBeNull()
  })

  it('does not infinite-loop on a zero-width global match', () => {
    const r = testRegex('a*', 'g', 'baaab')
    expect(r.error).toBeNull()
    expect(r.matches.length).toBeGreaterThan(0)
    expect(r.matches.length).toBeLessThan(100)
  })

  it('returns no matches (not an error) for a valid pattern with no hits', () => {
    const r = testRegex('xyz', '', 'abc')
    expect(r.error).toBeNull()
    expect(r.matches).toEqual([])
  })

  it('returns empty matches for an empty pattern', () => {
    expect(testRegex('', 'g', 'abc')).toEqual({ matches: [], error: null })
  })
})

describe('explainPattern', () => {
  it('returns nothing for an empty pattern', () => {
    expect(explainPattern('', '')).toEqual([])
  })

  it('explains anchors, flag-aware', () => {
    const nonMultiline = explainPattern('^abc$', '')
    expect(nonMultiline[0]!.description).toMatch(/start of the string/)
    expect(nonMultiline.at(-1)!.description).toMatch(/end of the string/)

    const multiline = explainPattern('^abc$', 'm')
    expect(multiline[0]!.description).toMatch(/start of a line/)
    expect(multiline.at(-1)!.description).toMatch(/end of a line/)
  })

  it('notes dot-all behavior for `.` when the s flag is set', () => {
    const withoutS = explainPattern('.', '')
    expect(withoutS[0]!.description).toMatch(/except line breaks/)
    const withS = explainPattern('.', 's')
    expect(withS[0]!.description).toMatch(/including line breaks/)
  })

  it('explains quantifiers, including lazy suffix', () => {
    const rows = explainPattern('a+?', '')
    const quant = rows.find((r) => r.token === '+?')
    expect(quant?.description).toMatch(/1 or more times \(lazy/)
  })

  it('explains {n,m} quantifiers', () => {
    const rows = explainPattern('a{2,4}', '')
    expect(rows.find((r) => r.token === '{2,4}')?.description).toMatch(/between 2 and 4 times/)
  })

  it('explains capturing, non-capturing, and named groups', () => {
    const rows = explainPattern('(a)(?:b)(?<c>c)', '')
    expect(rows.find((r) => r.token === '(')?.description).toMatch(/capturing group #1/)
    expect(rows.find((r) => r.token === '(?:')?.description).toMatch(/non-capturing/)
    expect(rows.find((r) => r.token === '(?<c>')?.description).toMatch(/"c"/)
  })

  it('explains backreferences', () => {
    const rows = explainPattern('(a)\\1', '')
    expect(rows.find((r) => r.token === '\\1')?.description).toMatch(/capturing group #1/)
  })

  it('explains alternation', () => {
    const rows = explainPattern('cat|dog', '')
    expect(rows.find((r) => r.token === '|')?.description).toMatch(/Alternation/)
  })

  it('explains lookaround', () => {
    const rows = explainPattern('foo(?=bar)(?!baz)(?<=qux)(?<!quux)', '')
    expect(rows.find((r) => r.token === '(?=')?.description).toMatch(/positive lookahead/)
    expect(rows.find((r) => r.token === '(?!')?.description).toMatch(/negative lookahead/)
    expect(rows.find((r) => r.token === '(?<=')?.description).toMatch(/positive lookbehind/)
    expect(rows.find((r) => r.token === '(?<!')?.description).toMatch(/negative lookbehind/)
  })

  it('merges adjacent literal characters, including escaped ones', () => {
    const rows = explainPattern('a\\.b', '')
    expect(rows).toHaveLength(1)
    expect(rows[0]!.token).toBe('a\\.b')
    expect(rows[0]!.description).toMatch(/literal text "a\.b"/)
  })

  it('describes character classes, including negation', () => {
    const rows = explainPattern('[a-z][^0-9]', '')
    expect(rows[0]!.description).toMatch(/any one character in the set/)
    expect(rows[1]!.description).toMatch(/NOT in the set/)
  })

  it('describes \\d \\w \\s and their negations', () => {
    const rows = explainPattern('\\d\\D\\w\\W\\s\\S', '')
    expect(rows.map((r) => r.token)).toEqual(['\\d', '\\D', '\\w', '\\W', '\\s', '\\S'])
  })
})

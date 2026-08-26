import { describe, it, expect } from 'vitest'
import { escapeSql, unescapeSql } from '@/utils/sqlEscape'

describe('escapeSql', () => {
  it('wraps plain text in surrounding quotes', () => {
    expect(escapeSql('hello')).toBe("'hello'")
  })

  it('doubles single quotes', () => {
    expect(escapeSql("O'Brien")).toBe("'O''Brien'")
  })

  it('handles multiple quotes in a row', () => {
    expect(escapeSql("a''b")).toBe("'a''''b'")
  })

  it('handles an empty string', () => {
    expect(escapeSql('')).toBe("''")
  })
})

describe('unescapeSql', () => {
  it('round-trips escaped text', () => {
    const original = 'O\'Brien said "hi"'
    expect(unescapeSql(escapeSql(original))).toBe(original)
  })

  it('strips one layer of surrounding quotes when present', () => {
    expect(unescapeSql("'hello'")).toBe('hello')
  })

  it('leaves text without surrounding quotes as-is (aside from undoubling)', () => {
    expect(unescapeSql('hello')).toBe('hello')
  })

  it('undoubles quotes after stripping the outer layer', () => {
    expect(unescapeSql("'O''Brien'")).toBe("O'Brien")
  })

  it('handles multiple quotes in a row', () => {
    expect(unescapeSql("'a''''b'")).toBe("a''b")
  })

  it('handles an empty string', () => {
    expect(unescapeSql('')).toBe('')
  })

  it('handles a bare doubled-quote literal', () => {
    expect(unescapeSql("''")).toBe('')
  })
})

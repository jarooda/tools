import { describe, it, expect } from 'vitest'
import { slugify } from '@/utils/slugify'

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('drops punctuation and collapses spaces', () => {
    expect(slugify('  Hello,   World!!  ')).toBe('hello-world')
  })

  it('strips diacritics', () => {
    expect(slugify('Crème brûlée')).toBe('creme-brulee')
    expect(slugify('naïve café')).toBe('naive-cafe')
  })

  it('supports a custom separator', () => {
    expect(slugify('Hello World', { separator: '_' })).toBe('hello_world')
  })

  it('can preserve case', () => {
    expect(slugify('Hello World', { lowercase: false })).toBe('Hello-World')
  })

  it('transliterates symbols when enabled', () => {
    expect(slugify('Cats & Dogs', { symbols: true })).toBe('cats-and-dogs')
    expect(slugify('50% off', { symbols: true })).toBe('50-percent-off')
  })

  it('returns empty string for punctuation-only input', () => {
    expect(slugify('!!!')).toBe('')
  })
})

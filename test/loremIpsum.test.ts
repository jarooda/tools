import { describe, it, expect } from 'vitest'
import { generateLorem } from '@/utils/loremIpsum'

describe('generateLorem', () => {
  it('returns empty string for count 0', () => {
    expect(generateLorem({ unit: 'words', count: 0 })).toBe('')
  })

  it('generates the requested number of words', () => {
    const text = generateLorem({ unit: 'words', count: 5 })
    expect(text.split(' ')).toHaveLength(5)
  })

  it('starts with the canonical phrase by default', () => {
    expect(generateLorem({ unit: 'words', count: 8 })).toMatch(/^Lorem ipsum dolor sit amet/)
  })

  it('can skip the canonical opener', () => {
    const text = generateLorem({ unit: 'words', count: 8, startWithLorem: false, rng: () => 0.5 })
    expect(text).not.toMatch(/^Lorem ipsum dolor sit amet/)
  })

  it('generates the requested number of sentences', () => {
    const text = generateLorem({ unit: 'sentences', count: 3, rng: () => 0.3 })
    expect(text.match(/\./g)).toHaveLength(3)
  })

  it('separates paragraphs with a blank line', () => {
    const text = generateLorem({ unit: 'paragraphs', count: 2, rng: () => 0.4 })
    expect(text.split('\n\n')).toHaveLength(2)
  })

  it('is deterministic for a fixed rng', () => {
    const a = generateLorem({ unit: 'sentences', count: 2, rng: () => 0.42 })
    const b = generateLorem({ unit: 'sentences', count: 2, rng: () => 0.42 })
    expect(a).toBe(b)
  })
})

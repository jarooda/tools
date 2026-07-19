import { describe, it, expect } from 'vitest'
import {
  secureRandomInt,
  secureRandomInts,
  rollDice,
  flipCoin,
  shuffleList,
  pickItems,
  parsePickList,
} from '@/utils/randomPick'

describe('secureRandomInt', () => {
  it('stays within an inclusive range', () => {
    for (let i = 0; i < 500; i++) {
      const n = secureRandomInt(1, 6)
      expect(n).toBeGreaterThanOrEqual(1)
      expect(n).toBeLessThanOrEqual(6)
    }
  })

  it('handles a single-value range', () => {
    expect(secureRandomInt(5, 5)).toBe(5)
  })

  it('normalises reversed bounds', () => {
    for (let i = 0; i < 50; i++) {
      const n = secureRandomInt(10, 1)
      expect(n).toBeGreaterThanOrEqual(1)
      expect(n).toBeLessThanOrEqual(10)
    }
  })
})

describe('secureRandomInts', () => {
  it('returns the requested count', () => {
    expect(secureRandomInts(1, 100, 7)).toHaveLength(7)
  })

  it('returns distinct values when unique, capped at range size', () => {
    const vals = secureRandomInts(1, 5, 20, true)
    expect(vals).toHaveLength(5)
    expect(new Set(vals).size).toBe(5)
  })
})

describe('rollDice / flipCoin', () => {
  it('rolls within face bounds', () => {
    for (const v of rollDice(20, 10)) {
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(20)
    }
  })

  it('flips heads or tails', () => {
    expect(['Heads', 'Tails']).toContain(flipCoin())
  })
})

describe('shuffleList / pickItems', () => {
  it('shuffle keeps the same multiset without mutating input', () => {
    const src = [1, 2, 3, 4, 5]
    const out = shuffleList(src)
    expect(out).toHaveLength(5)
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5])
    expect(src).toEqual([1, 2, 3, 4, 5])
  })

  it('picks unique items without replacement', () => {
    const out = pickItems(['a', 'b', 'c'], 3, true)
    expect(new Set(out).size).toBe(3)
  })

  it('allows repeats when not unique', () => {
    const out = pickItems(['only'], 4, false)
    expect(out).toEqual(['only', 'only', 'only', 'only'])
  })

  it('returns empty for an empty list', () => {
    expect(pickItems([], 3)).toEqual([])
  })
})

describe('parsePickList', () => {
  it('trims and drops blank lines', () => {
    expect(parsePickList(' a \n\n b \n')).toEqual(['a', 'b'])
  })
})

import { describe, it, expect } from 'vitest'
import {
  generatePassword,
  passwordPool,
  passwordSets,
  passwordEntropyBits,
  passwordStrength,
  type PasswordOptions,
} from '@/utils/password'

const base: PasswordOptions = {
  length: 16,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: false,
  excludeAmbiguous: false,
}

describe('generatePassword', () => {
  it('produces a password of the requested length', () => {
    for (let i = 0; i < 20; i++) {
      expect(generatePassword({ ...base, length: 24 })).toHaveLength(24)
    }
  })

  it('only uses characters from the active pool', () => {
    const opts = { ...base, symbols: true }
    const pool = new Set(passwordPool(opts))
    for (let i = 0; i < 20; i++) {
      for (const ch of generatePassword(opts)) expect(pool.has(ch)).toBe(true)
    }
  })

  it('includes at least one char from every selected class', () => {
    const opts = { ...base, symbols: true, length: 12 }
    const sets = passwordSets(opts)
    for (let i = 0; i < 30; i++) {
      const pw = generatePassword(opts)
      for (const set of sets) {
        expect([...pw].some((c) => set.includes(c))).toBe(true)
      }
    }
  })

  it('excludes ambiguous characters when asked', () => {
    const opts = { ...base, excludeAmbiguous: true, length: 40 }
    for (let i = 0; i < 20; i++) {
      expect(generatePassword(opts)).not.toMatch(/[Il1O0o]/)
    }
  })

  it('returns empty when no class is selected', () => {
    expect(generatePassword({ ...base, lowercase: false, uppercase: false, digits: false })).toBe(
      '',
    )
  })
})

describe('passwordEntropyBits', () => {
  it('scales with length and pool size', () => {
    expect(passwordEntropyBits(10, 2)).toBe(10)
    expect(passwordEntropyBits(8, 62)).toBe(48)
    expect(passwordEntropyBits(0, 62)).toBe(0)
    expect(passwordEntropyBits(10, 1)).toBe(0)
  })
})

describe('passwordStrength', () => {
  it('buckets entropy into labels', () => {
    expect(passwordStrength(20).label).toBe('Very weak')
    expect(passwordStrength(35).label).toBe('Weak')
    expect(passwordStrength(50).label).toBe('Fair')
    expect(passwordStrength(70).label).toBe('Strong')
    expect(passwordStrength(128).label).toBe('Very strong')
  })
})

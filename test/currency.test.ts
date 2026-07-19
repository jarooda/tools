import { describe, it, expect } from 'vitest'
import { convertCurrency, convertCurrencyToAll, CURRENCIES, type Rates } from '@/utils/currency'

// Fixture rates relative to USD (base). No network involved.
const RATES: Rates = { USD: 1, EUR: 0.9, GBP: 0.8, JPY: 150 }

const approx = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps

describe('convertCurrency', () => {
  it('returns the same amount for identical currencies', () => {
    expect(convertCurrency(42, 'EUR', 'EUR', RATES)).toBe(42)
  })

  it('converts through the base currency', () => {
    expect(approx(convertCurrency(1, 'USD', 'EUR', RATES), 0.9)).toBe(true)
    expect(approx(convertCurrency(1, 'USD', 'JPY', RATES), 150)).toBe(true)
    // 1 EUR = (1 / 0.9) USD = 1.111.. USD → GBP = × 0.8
    expect(approx(convertCurrency(1, 'EUR', 'GBP', RATES), (1 / 0.9) * 0.8)).toBe(true)
  })

  it('round-trips between two currencies', () => {
    const there = convertCurrency(250, 'JPY', 'GBP', RATES)
    const back = convertCurrency(there, 'GBP', 'JPY', RATES)
    expect(approx(back, 250)).toBe(true)
  })

  it('throws when a rate is missing', () => {
    expect(() => convertCurrency(1, 'USD', 'XYZ', RATES)).toThrow()
  })
})

describe('convertCurrencyToAll', () => {
  it('only includes currencies present in both the list and the rates', () => {
    const all = convertCurrencyToAll(1, 'USD', RATES)
    const codes = all.map((r) => r.code)
    expect(codes).toEqual(['USD', 'EUR', 'GBP', 'JPY'])
    // Every returned code is a known currency.
    for (const c of codes) expect(CURRENCIES.some((x) => x.code === c)).toBe(true)
  })

  it('computes each value', () => {
    const all = convertCurrencyToAll(10, 'USD', RATES)
    expect(all.find((r) => r.code === 'EUR')!.value).toBe(9)
  })
})

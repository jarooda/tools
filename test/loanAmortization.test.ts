import { describe, it, expect } from 'vitest'
import { parseDateOnly } from '@/utils/dateDuration'
import { calculateScheduledPayment, buildAmortizationSchedule } from '@/utils/loanAmortization'

describe('calculateScheduledPayment', () => {
  it('matches a known amortization table value', () => {
    const payment = calculateScheduledPayment(300_000, 6.5, 360)
    expect(payment).toBeCloseTo(1896.2, 1)
  })

  it('divides principal evenly by term at 0% interest', () => {
    const payment = calculateScheduledPayment(12_000, 0, 12)
    expect(payment).toBeCloseTo(1000, 6)
  })
})

describe('buildAmortizationSchedule', () => {
  it('runs a standard loan to full term with a zero final balance', () => {
    const result = buildAmortizationSchedule({
      principal: 300_000,
      annualRatePct: 6.5,
      termMonths: 360,
    })
    expect(result.scheduledMonthlyPayment).toBeCloseTo(1896.2, 1)
    expect(result.payoffMonths).toBe(360)
    expect(result.schedule).toHaveLength(360)
    expect(result.schedule.at(-1)!.balance).toBe(0)
    expect(result.totalPaid).toBeCloseTo(result.totalInterest + 300_000, 4)
  })

  it('handles a 0% interest loan with no interest accrued', () => {
    const result = buildAmortizationSchedule({
      principal: 12_000,
      annualRatePct: 0,
      termMonths: 12,
    })
    expect(result.totalInterest).toBeCloseTo(0, 6)
    expect(result.schedule.every((row) => row.interest === 0)).toBe(true)
    expect(result.schedule.at(-1)!.balance).toBe(0)
    expect(result.totalPaid).toBeCloseTo(12_000, 6)
  })

  it('pays off early with an extra monthly payment, never going negative', () => {
    const base = buildAmortizationSchedule({
      principal: 50_000,
      annualRatePct: 5,
      termMonths: 120,
    })
    const withExtra = buildAmortizationSchedule({
      principal: 50_000,
      annualRatePct: 5,
      termMonths: 120,
      extraMonthlyPayment: 500,
    })
    expect(withExtra.payoffMonths).toBeLessThan(base.payoffMonths)
    expect(withExtra.schedule.at(-1)!.balance).toBe(0)
    expect(withExtra.schedule.every((row) => row.balance >= 0)).toBe(true)
    expect(withExtra.totalInterest).toBeLessThan(base.totalInterest)
  })

  it('rolls yearly totals up to match the overall schedule totals', () => {
    const result = buildAmortizationSchedule({
      principal: 20_000,
      annualRatePct: 4.25,
      termMonths: 30,
    })
    const yearlyPrincipal = result.yearly.reduce((sum, y) => sum + y.principalPaid, 0)
    const yearlyInterest = result.yearly.reduce((sum, y) => sum + y.interestPaid, 0)
    const yearlyTotal = result.yearly.reduce((sum, y) => sum + y.totalPaid, 0)
    expect(yearlyPrincipal).toBeCloseTo(20_000, 4)
    expect(yearlyInterest).toBeCloseTo(result.totalInterest, 4)
    expect(yearlyTotal).toBeCloseTo(result.totalPaid, 4)
    expect(result.yearly.at(-1)!.endingBalance).toBeCloseTo(0, 4)
  })

  it('leaves schedule dates null without a start date, and populated with one', () => {
    const withoutStart = buildAmortizationSchedule({
      principal: 10_000,
      annualRatePct: 3,
      termMonths: 6,
    })
    expect(withoutStart.schedule.every((row) => row.dateMs === null)).toBe(true)
    expect(withoutStart.payoffDateMs).toBeNull()

    const startMs = parseDateOnly('2026-01-15')!
    const withStart = buildAmortizationSchedule({
      principal: 10_000,
      annualRatePct: 3,
      termMonths: 6,
      startDateMs: startMs,
    })
    expect(withStart.schedule.every((row) => row.dateMs !== null)).toBe(true)
    expect(withStart.schedule[0]!.dateMs).toBe(parseDateOnly('2026-02-15'))
    expect(withStart.payoffDateMs).toBe(withStart.schedule.at(-1)!.dateMs)
  })
})

import { describe, it, expect } from 'vitest'
import { buildCompoundInterestSchedule } from '@/utils/compoundInterest'

describe('buildCompoundInterestSchedule', () => {
  it('matches a known ballpark for a standard savings scenario', () => {
    const result = buildCompoundInterestSchedule({
      principal: 10_000,
      annualRatePct: 5,
      compoundingFrequency: 'monthly',
      years: 10,
      monthlyContribution: 100,
    })
    // 10k @ 5%/yr monthly for 10yr + $100/mo contributions lands roughly in the
    // 32k-33k range (principal + ~12k contributions + ~10-11k interest).
    expect(result.finalBalance).toBeGreaterThan(30_000)
    expect(result.finalBalance).toBeLessThan(35_000)
    expect(result.totalContributions).toBeCloseTo(12_000, 6)
    expect(result.totalInterest).toBeCloseTo(
      result.finalBalance - result.totalPrincipal - result.totalContributions,
      9,
    )
  })

  it('reduces monthly compounding to the plain monthly rate', () => {
    const result = buildCompoundInterestSchedule({
      principal: 1_000,
      annualRatePct: 6,
      compoundingFrequency: 'monthly',
      years: 1,
    })
    expect(result.schedule[0]!.interestEarned).toBeCloseTo(1_000 * (0.06 / 12), 9)
  })

  it('accrues no interest at a 0% rate', () => {
    const result = buildCompoundInterestSchedule({
      principal: 5_000,
      annualRatePct: 0,
      compoundingFrequency: 'monthly',
      years: 2,
      monthlyContribution: 50,
    })
    expect(result.totalInterest).toBeCloseTo(0, 9)
    expect(result.schedule.every((row) => row.interestEarned === 0)).toBe(true)
    expect(result.finalBalance).toBeCloseTo(5_000 + 50 * 24, 6)
  })

  it('rolls yearly totals up to match the overall schedule totals', () => {
    const result = buildCompoundInterestSchedule({
      principal: 2_000,
      annualRatePct: 4.25,
      compoundingFrequency: 'quarterly',
      years: 3,
      monthlyContribution: 25,
    })
    const yearlyContributions = result.yearly.reduce((sum, y) => sum + y.contributions, 0)
    const yearlyInterest = result.yearly.reduce((sum, y) => sum + y.interestEarned, 0)
    expect(yearlyContributions).toBeCloseTo(result.totalContributions, 6)
    expect(yearlyInterest).toBeCloseTo(result.totalInterest, 6)
    expect(result.yearly.at(-1)!.endingBalance).toBeCloseTo(result.finalBalance, 6)
  })

  it('ranks effective annual yield by compounding frequency at the same nominal rate', () => {
    const base = { principal: 1_000, annualRatePct: 5, years: 1 } as const
    const annually = buildCompoundInterestSchedule({ ...base, compoundingFrequency: 'annually' })
    const monthly = buildCompoundInterestSchedule({ ...base, compoundingFrequency: 'monthly' })
    const daily = buildCompoundInterestSchedule({ ...base, compoundingFrequency: 'daily' })

    expect(annually.effectiveAnnualRatePct).toBeCloseTo(5, 6)
    expect(daily.effectiveAnnualRatePct).toBeGreaterThan(monthly.effectiveAnnualRatePct)
    expect(monthly.effectiveAnnualRatePct).toBeGreaterThan(annually.effectiveAnnualRatePct)
  })
})

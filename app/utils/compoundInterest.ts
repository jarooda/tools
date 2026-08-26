/**
 * Compound interest growth projection — pure, dependency-free (unit-tested in `test/`).
 */

export type CompoundingFrequency = 'annually' | 'semiannually' | 'quarterly' | 'monthly' | 'daily'

export interface CompoundInterestInput {
  principal: number
  annualRatePct: number
  compoundingFrequency: CompoundingFrequency
  years: number
  /** Added at the end of each month, after that month's interest is applied. Defaults to 0. */
  monthlyContribution?: number
}

export interface CompoundInterestMonthRow {
  month: number
  startingBalance: number
  interestEarned: number
  contribution: number
  endingBalance: number
}

export interface CompoundInterestYearRow {
  year: number
  contributions: number
  interestEarned: number
  endingBalance: number
}

export interface CompoundInterestResult {
  finalBalance: number
  totalPrincipal: number
  totalContributions: number
  totalInterest: number
  /** Effective annual yield (APY) at the chosen compounding frequency. */
  effectiveAnnualRatePct: number
  schedule: CompoundInterestMonthRow[]
  yearly: CompoundInterestYearRow[]
}

const PERIODS_PER_YEAR: Record<CompoundingFrequency, number> = {
  annually: 1,
  semiannually: 2,
  quarterly: 4,
  monthly: 12,
  // Discrete daily compounding approximation (n=365), not continuous compounding.
  daily: 365,
}

export function buildCompoundInterestSchedule(
  input: CompoundInterestInput,
): CompoundInterestResult {
  const { principal, annualRatePct, compoundingFrequency, years, monthlyContribution = 0 } = input

  const n = PERIODS_PER_YEAR[compoundingFrequency]
  const monthlyRate = Math.pow(1 + annualRatePct / 100 / n, n / 12) - 1
  const effectiveAnnualRatePct = (Math.pow(1 + monthlyRate, 12) - 1) * 100

  const termMonths = Math.max(0, Math.round(years * 12))

  const schedule: CompoundInterestMonthRow[] = []
  let balance = principal
  let totalContributions = 0

  for (let month = 1; month <= termMonths; month++) {
    const startingBalance = balance
    const interestEarned = startingBalance * monthlyRate
    const endingBalance = startingBalance + interestEarned + monthlyContribution

    balance = endingBalance
    totalContributions += monthlyContribution

    schedule.push({
      month,
      startingBalance,
      interestEarned,
      contribution: monthlyContribution,
      endingBalance,
    })
  }

  const finalBalance = balance
  const totalInterest = finalBalance - principal - totalContributions

  const yearly: CompoundInterestYearRow[] = []
  for (let i = 0; i < schedule.length; i += 12) {
    const rows = schedule.slice(i, i + 12)
    yearly.push({
      year: Math.floor(i / 12) + 1,
      contributions: rows.reduce((sum, r) => sum + r.contribution, 0),
      interestEarned: rows.reduce((sum, r) => sum + r.interestEarned, 0),
      endingBalance: rows[rows.length - 1]!.endingBalance,
    })
  }

  return {
    finalBalance,
    totalPrincipal: principal,
    totalContributions,
    totalInterest,
    effectiveAnnualRatePct,
    schedule,
    yearly,
  }
}

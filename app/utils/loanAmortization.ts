/**
 * Fixed-rate loan amortization — pure, dependency-free (unit-tested in `test/`).
 */

export interface LoanInput {
  principal: number
  annualRatePct: number
  termMonths: number
  /** Extra amount applied to principal each month. Defaults to 0. */
  extraMonthlyPayment?: number
  /** Loan start date (epoch ms, UTC-anchored). `null`/omitted → no calendar dates. */
  startDateMs?: number | null
}

export interface AmortizationRow {
  paymentNumber: number
  dateMs: number | null
  principal: number
  interest: number
  extra: number
  totalPayment: number
  balance: number
}

export interface AmortizationYearRow {
  year: number
  principalPaid: number
  interestPaid: number
  totalPaid: number
  endingBalance: number
}

export interface LoanResult {
  scheduledMonthlyPayment: number
  totalInterest: number
  totalPaid: number
  payoffMonths: number
  payoffDateMs: number | null
  schedule: AmortizationRow[]
  yearly: AmortizationYearRow[]
}

/** Standard fixed-rate monthly payment; `M = P/n` when `annualRatePct` is 0. */
export function calculateScheduledPayment(
  principal: number,
  annualRatePct: number,
  termMonths: number,
): number {
  if (termMonths <= 0) return 0
  if (annualRatePct === 0) return principal / termMonths
  const r = annualRatePct / 100 / 12
  const factor = Math.pow(1 + r, termMonths)
  return (principal * r * factor) / (factor - 1)
}

/** Add `months` calendar months to a UTC-anchored epoch-ms date. */
function addMonths(ms: number, months: number): number {
  const d = new Date(ms)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate())
}

export function buildAmortizationSchedule(input: LoanInput): LoanResult {
  const {
    principal,
    annualRatePct,
    termMonths,
    extraMonthlyPayment = 0,
    startDateMs = null,
  } = input

  const scheduledMonthlyPayment = calculateScheduledPayment(principal, annualRatePct, termMonths)
  const monthlyRate = annualRatePct / 100 / 12

  const schedule: AmortizationRow[] = []
  let balance = principal
  let totalInterest = 0
  let totalPaid = 0

  for (let month = 1; month <= termMonths && balance > 0; month++) {
    const interest = balance * monthlyRate
    let principalPortion = scheduledMonthlyPayment - interest + extraMonthlyPayment
    let extra = extraMonthlyPayment
    let totalPayment = scheduledMonthlyPayment + extraMonthlyPayment

    if (principalPortion >= balance) {
      const overpaid = principalPortion - balance
      principalPortion = balance
      extra = Math.max(0, extra - overpaid)
      totalPayment = interest + principalPortion
    }

    balance = Math.max(0, balance - principalPortion)
    totalInterest += interest
    totalPaid += totalPayment

    schedule.push({
      paymentNumber: month,
      dateMs: startDateMs != null ? addMonths(startDateMs, month) : null,
      principal: principalPortion,
      interest,
      extra,
      totalPayment,
      balance,
    })
  }

  const payoffMonths = schedule.length
  const payoffDateMs = payoffMonths > 0 ? schedule[payoffMonths - 1]!.dateMs : null

  const yearly: AmortizationYearRow[] = []
  for (let i = 0; i < schedule.length; i += 12) {
    const rows = schedule.slice(i, i + 12)
    const year =
      startDateMs != null ? new Date(rows[0]!.dateMs!).getUTCFullYear() : Math.floor(i / 12) + 1
    yearly.push({
      year,
      principalPaid: rows.reduce((sum, r) => sum + r.principal, 0),
      interestPaid: rows.reduce((sum, r) => sum + r.interest, 0),
      totalPaid: rows.reduce((sum, r) => sum + r.totalPayment, 0),
      endingBalance: rows[rows.length - 1]!.balance,
    })
  }

  return {
    scheduledMonthlyPayment,
    totalInterest,
    totalPaid,
    payoffMonths,
    payoffDateMs,
    schedule,
    yearly,
  }
}

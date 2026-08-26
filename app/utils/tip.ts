/**
 * Tip / bill split arithmetic — pure, dependency-free (unit-tested in `test/`).
 */

export interface TipInput {
  billAmount: number
  tipPercent: number
  peopleCount: number
  /** Round each person's share up to the nearest cent. @default false */
  roundUp?: boolean
}

export interface TipResult {
  tipAmount: number
  totalAmount: number
  /** Rounded up to the nearest cent when `roundUp` is set. */
  perPerson: number
  /** Extra collected from rounding up. Zero when `roundUp` is off or no rounding occurred. */
  roundingDelta: number
}

export function calculateTipSplit(input: TipInput): TipResult {
  const { billAmount, tipPercent, peopleCount, roundUp = false } = input

  const tipAmount = billAmount * (tipPercent / 100)
  const totalAmount = billAmount + tipAmount
  const perPersonRaw = totalAmount / peopleCount
  const perPerson = roundUp ? Math.ceil(perPersonRaw * 100) / 100 : perPersonRaw
  const roundingDelta = roundUp ? perPerson * peopleCount - totalAmount : 0

  return { tipAmount, totalAmount, perPerson, roundingDelta }
}

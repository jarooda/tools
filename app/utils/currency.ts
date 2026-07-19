/**
 * Currency conversion — pure, DOM-free logic (unit-tested in `test/`).
 * The math is offline and deterministic: given a `rates` table (units of each
 * currency per 1 unit of the table's base), convert an amount between any two.
 * Fetching live rates is the server's job (`server/api/fx.get.ts`).
 */

export interface Currency {
  code: string
  name: string
  symbol: string
}

/** A rates table: currency code → units per 1 unit of the base currency. */
export type Rates = Record<string, number>

/** Common currencies offered by the tool. */
export const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł' },
]

/**
 * Convert `amount` from one currency to another using `rates`.
 * Throws if either currency is missing from the table.
 */
export function convertCurrency(amount: number, from: string, to: string, rates: Rates): number {
  const rFrom = rates[from]
  const rTo = rates[to]
  if (rFrom == null || rTo == null) {
    throw new Error(`Missing rate for ${rFrom == null ? from : to}`)
  }
  if (from === to) return amount
  // amount → base → target
  return (amount / rFrom) * rTo
}

export interface CurrencyResult extends Currency {
  value: number
}

/**
 * Convert `amount` (in `from`) to every currency we have both a definition and
 * a rate for, in `CURRENCIES` order.
 */
export function convertToAll(
  amount: number,
  from: string,
  rates: Rates,
  currencies: Currency[] = CURRENCIES,
): CurrencyResult[] {
  return currencies
    .filter((c) => rates[c.code] != null)
    .map((c) => ({ ...c, value: convertCurrency(amount, from, c.code, rates) }))
}

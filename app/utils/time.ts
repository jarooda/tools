/**
 * Time / duration conversion — pure, DOM-free logic (unit-tested in `test/`).
 * Routes through seconds (the base unit). Month and year use the average
 * Gregorian length (365.2425 days / year), so they're approximate by nature.
 */
import { convertLinear, convertLinearAll, type LinearUnit } from './linear'

export type TimeUnit = 'ms' | 's' | 'min' | 'h' | 'd' | 'wk' | 'mo' | 'yr'

const DAY = 86_400
const YEAR = 365.2425 * DAY // average Gregorian year

export const TIME_UNITS: LinearUnit<TimeUnit>[] = [
  { unit: 'ms', name: 'Millisecond', symbol: 'ms', factor: 0.001, group: 'Short' },
  { unit: 's', name: 'Second', symbol: 's', factor: 1, group: 'Short' },
  { unit: 'min', name: 'Minute', symbol: 'min', factor: 60, group: 'Short' },
  { unit: 'h', name: 'Hour', symbol: 'h', factor: 3600, group: 'Short' },
  { unit: 'd', name: 'Day', symbol: 'd', factor: DAY, group: 'Long' },
  { unit: 'wk', name: 'Week', symbol: 'wk', factor: 7 * DAY, group: 'Long' },
  { unit: 'mo', name: 'Month (avg)', symbol: 'mo', factor: YEAR / 12, group: 'Long' },
  { unit: 'yr', name: 'Year (avg)', symbol: 'yr', factor: YEAR, group: 'Long' },
]

export function convertTime(value: number, from: TimeUnit, to: TimeUnit): number {
  return convertLinear(value, from, to, TIME_UNITS)
}

export function convertTimeToAll(value: number, from: TimeUnit) {
  return convertLinearAll(value, from, TIME_UNITS)
}

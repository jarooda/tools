/**
 * Temperature conversion — pure, DOM-free logic (unit-tested in `test/`).
 * Converts between Celsius, Fahrenheit, and Kelvin.
 */

/** Supported temperature units. */
export type TemperatureUnit = 'c' | 'f' | 'k'

export interface TemperatureUnitMeta {
  unit: TemperatureUnit
  /** Full name, e.g. "Celsius". */
  name: string
  /** Symbol shown next to values, e.g. "°C". */
  symbol: string
}

export const TEMPERATURE_UNITS: TemperatureUnitMeta[] = [
  { unit: 'c', name: 'Celsius', symbol: '°C' },
  { unit: 'f', name: 'Fahrenheit', symbol: '°F' },
  { unit: 'k', name: 'Kelvin', symbol: 'K' },
]

/** Absolute zero, in Celsius — the lowest physically valid temperature. */
export const ABSOLUTE_ZERO_C = -273.15

/** Convert any supported unit to Celsius (the internal base unit). */
function toCelsius(value: number, from: TemperatureUnit): number {
  switch (from) {
    case 'c':
      return value
    case 'f':
      return (value - 32) * (5 / 9)
    case 'k':
      return value + ABSOLUTE_ZERO_C
  }
}

/** Convert Celsius to any supported unit. */
function fromCelsius(celsius: number, to: TemperatureUnit): number {
  switch (to) {
    case 'c':
      return celsius
    case 'f':
      return celsius * (9 / 5) + 32
    case 'k':
      return celsius - ABSOLUTE_ZERO_C
  }
}

/**
 * Convert a temperature `value` from one unit to another.
 * Returns a plain number; rounding/formatting is the caller's concern.
 */
export function convertTemperature(
  value: number,
  from: TemperatureUnit,
  to: TemperatureUnit,
): number {
  if (from === to) return value
  return fromCelsius(toCelsius(value, from), to)
}

/**
 * Convert `value` (in `from` unit) to every supported unit, in
 * `TEMPERATURE_UNITS` order. Handy for showing all results at once.
 */
export function convertToAll(
  value: number,
  from: TemperatureUnit,
): Array<TemperatureUnitMeta & { value: number }> {
  return TEMPERATURE_UNITS.map((meta) => ({
    ...meta,
    value: convertTemperature(value, from, meta.unit),
  }))
}

/**
 * Whether a `value` in `unit` is below absolute zero (physically impossible).
 * Useful for a soft validation warning in the UI.
 */
export function isBelowAbsoluteZero(value: number, unit: TemperatureUnit): boolean {
  return convertTemperature(value, unit, 'c') < ABSOLUTE_ZERO_C - 1e-9
}

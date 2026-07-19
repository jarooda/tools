/**
 * Length / distance conversion — pure, DOM-free logic (unit-tested in `test/`).
 * Everything routes through metres (the SI base unit): value → metres → target.
 */

/** Supported length units. */
export type LengthUnit = 'mm' | 'cm' | 'm' | 'km' | 'in' | 'ft' | 'yd' | 'mi' | 'nmi'

/** Which family a unit belongs to — used to group the picker. */
export type LengthSystem = 'metric' | 'imperial'

export interface LengthUnitMeta {
  unit: LengthUnit
  /** Full name, e.g. "Kilometre". */
  name: string
  /** Symbol shown next to values, e.g. "km". */
  symbol: string
  /** How many metres in one of this unit. */
  metres: number
  system: LengthSystem
}

/**
 * Every supported unit, in display order. Factors are exact by definition
 * (an inch is exactly 0.0254 m, a nautical mile exactly 1852 m).
 */
export const LENGTH_UNITS: LengthUnitMeta[] = [
  { unit: 'mm', name: 'Millimetre', symbol: 'mm', metres: 0.001, system: 'metric' },
  { unit: 'cm', name: 'Centimetre', symbol: 'cm', metres: 0.01, system: 'metric' },
  { unit: 'm', name: 'Metre', symbol: 'm', metres: 1, system: 'metric' },
  { unit: 'km', name: 'Kilometre', symbol: 'km', metres: 1000, system: 'metric' },
  { unit: 'in', name: 'Inch', symbol: 'in', metres: 0.0254, system: 'imperial' },
  { unit: 'ft', name: 'Foot', symbol: 'ft', metres: 0.3048, system: 'imperial' },
  { unit: 'yd', name: 'Yard', symbol: 'yd', metres: 0.9144, system: 'imperial' },
  { unit: 'mi', name: 'Mile', symbol: 'mi', metres: 1609.344, system: 'imperial' },
  { unit: 'nmi', name: 'Nautical mile', symbol: 'nmi', metres: 1852, system: 'imperial' },
]

const metresOf = new Map(LENGTH_UNITS.map((u) => [u.unit, u.metres]))

/**
 * Convert a `value` from one length unit to another.
 * Returns a plain number; rounding/formatting is the caller's concern.
 */
export function convertLength(value: number, from: LengthUnit, to: LengthUnit): number {
  if (from === to) return value
  const fromMetres = metresOf.get(from)!
  const toMetres = metresOf.get(to)!
  return (value * fromMetres) / toMetres
}

/**
 * Convert `value` (in `from` unit) to every supported unit, in
 * `LENGTH_UNITS` order. Handy for showing all results at once.
 */
export function convertLengthToAll(
  value: number,
  from: LengthUnit,
): Array<LengthUnitMeta & { value: number }> {
  return LENGTH_UNITS.map((meta) => ({
    ...meta,
    value: convertLength(value, from, meta.unit),
  }))
}

/**
 * Generic linear-unit conversion — pure, DOM-free logic (unit-tested in `test/`).
 * Any quantity whose units relate by a constant factor (length, weight, volume,
 * area, speed, time, data size) routes through a common base unit:
 * value → base → target. Temperature is NOT linear (it has an offset), so it
 * has its own module.
 */

export interface LinearUnit<U extends string = string> {
  unit: U
  /** Full name, e.g. "Kilogram". */
  name: string
  /** Symbol shown next to values, e.g. "kg". */
  symbol: string
  /** How many base units equal one of this unit (base unit has factor 1). */
  factor: number
  /** Optional grouping label for the picker, e.g. "Metric". */
  group?: string
}

/** Convert a `value` from one unit to another within the same `units` set. */
export function convertLinear<U extends string>(
  value: number,
  from: U,
  to: U,
  units: LinearUnit<U>[],
): number {
  if (from === to) return value
  const fromFactor = units.find((u) => u.unit === from)!.factor
  const toFactor = units.find((u) => u.unit === to)!.factor
  return (value * fromFactor) / toFactor
}

/**
 * Convert `value` (in `from` unit) to every unit in the set, in `units` order.
 * Handy for showing all results at once.
 */
export function convertLinearAll<U extends string>(
  value: number,
  from: U,
  units: LinearUnit<U>[],
): Array<LinearUnit<U> & { value: number }> {
  return units.map((u) => ({
    ...u,
    value: convertLinear(value, from, u.unit, units),
  }))
}

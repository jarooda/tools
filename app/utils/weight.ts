/**
 * Weight / mass conversion — pure, DOM-free logic (unit-tested in `test/`).
 * Routes through grams (the base unit): value → grams → target.
 */
import { convertLinear, convertLinearAll, type LinearUnit } from './linear'

export type WeightUnit = 'mg' | 'g' | 'kg' | 't' | 'oz' | 'lb' | 'st'

/** Every supported unit, in display order. Imperial factors are exact by definition. */
export const WEIGHT_UNITS: LinearUnit<WeightUnit>[] = [
  { unit: 'mg', name: 'Milligram', symbol: 'mg', factor: 0.001, group: 'Metric' },
  { unit: 'g', name: 'Gram', symbol: 'g', factor: 1, group: 'Metric' },
  { unit: 'kg', name: 'Kilogram', symbol: 'kg', factor: 1000, group: 'Metric' },
  { unit: 't', name: 'Tonne', symbol: 't', factor: 1_000_000, group: 'Metric' },
  { unit: 'oz', name: 'Ounce', symbol: 'oz', factor: 28.349523125, group: 'Imperial / US' },
  { unit: 'lb', name: 'Pound', symbol: 'lb', factor: 453.59237, group: 'Imperial / US' },
  { unit: 'st', name: 'Stone', symbol: 'st', factor: 6350.29318, group: 'Imperial / US' },
]

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  return convertLinear(value, from, to, WEIGHT_UNITS)
}

export function convertWeightToAll(value: number, from: WeightUnit) {
  return convertLinearAll(value, from, WEIGHT_UNITS)
}

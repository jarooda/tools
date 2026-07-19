/**
 * Volume conversion — pure, DOM-free logic (unit-tested in `test/`).
 * Routes through litres (the base unit). US customary units used for the
 * cooking/imperial side (tsp, tbsp, cup, pint, quart, gallon).
 */
import { convertLinear, convertLinearAll, type LinearUnit } from './linear'

export type VolumeUnit = 'ml' | 'l' | 'm3' | 'tsp' | 'tbsp' | 'floz' | 'cup' | 'pt' | 'qt' | 'gal'

export const VOLUME_UNITS: LinearUnit<VolumeUnit>[] = [
  { unit: 'ml', name: 'Millilitre', symbol: 'mL', factor: 0.001, group: 'Metric' },
  { unit: 'l', name: 'Litre', symbol: 'L', factor: 1, group: 'Metric' },
  { unit: 'm3', name: 'Cubic metre', symbol: 'm³', factor: 1000, group: 'Metric' },
  { unit: 'tsp', name: 'Teaspoon', symbol: 'tsp', factor: 0.00492892159375, group: 'US' },
  { unit: 'tbsp', name: 'Tablespoon', symbol: 'tbsp', factor: 0.01478676478125, group: 'US' },
  { unit: 'floz', name: 'Fluid ounce', symbol: 'fl oz', factor: 0.0295735295625, group: 'US' },
  { unit: 'cup', name: 'Cup', symbol: 'cup', factor: 0.2365882365, group: 'US' },
  { unit: 'pt', name: 'Pint', symbol: 'pt', factor: 0.473176473, group: 'US' },
  { unit: 'qt', name: 'Quart', symbol: 'qt', factor: 0.946352946, group: 'US' },
  { unit: 'gal', name: 'Gallon', symbol: 'gal', factor: 3.785411784, group: 'US' },
]

export function convertVolume(value: number, from: VolumeUnit, to: VolumeUnit): number {
  return convertLinear(value, from, to, VOLUME_UNITS)
}

export function convertVolumeToAll(value: number, from: VolumeUnit) {
  return convertLinearAll(value, from, VOLUME_UNITS)
}

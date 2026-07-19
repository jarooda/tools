/**
 * Area conversion — pure, DOM-free logic (unit-tested in `test/`).
 * Routes through square metres (the base unit).
 */
import { convertLinear, convertLinearAll, type LinearUnit } from './linear'

export type AreaUnit = 'mm2' | 'cm2' | 'm2' | 'ha' | 'km2' | 'in2' | 'ft2' | 'yd2' | 'ac' | 'mi2'

export const AREA_UNITS: LinearUnit<AreaUnit>[] = [
  { unit: 'mm2', name: 'Square millimetre', symbol: 'mm²', factor: 0.000001, group: 'Metric' },
  { unit: 'cm2', name: 'Square centimetre', symbol: 'cm²', factor: 0.0001, group: 'Metric' },
  { unit: 'm2', name: 'Square metre', symbol: 'm²', factor: 1, group: 'Metric' },
  { unit: 'ha', name: 'Hectare', symbol: 'ha', factor: 10_000, group: 'Metric' },
  { unit: 'km2', name: 'Square kilometre', symbol: 'km²', factor: 1_000_000, group: 'Metric' },
  { unit: 'in2', name: 'Square inch', symbol: 'in²', factor: 0.00064516, group: 'Imperial / US' },
  { unit: 'ft2', name: 'Square foot', symbol: 'ft²', factor: 0.09290304, group: 'Imperial / US' },
  { unit: 'yd2', name: 'Square yard', symbol: 'yd²', factor: 0.83612736, group: 'Imperial / US' },
  { unit: 'ac', name: 'Acre', symbol: 'ac', factor: 4046.8564224, group: 'Imperial / US' },
  {
    unit: 'mi2',
    name: 'Square mile',
    symbol: 'mi²',
    factor: 2_589_988.110336,
    group: 'Imperial / US',
  },
]

export function convertArea(value: number, from: AreaUnit, to: AreaUnit): number {
  return convertLinear(value, from, to, AREA_UNITS)
}

export function convertToAll(value: number, from: AreaUnit) {
  return convertLinearAll(value, from, AREA_UNITS)
}

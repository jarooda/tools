/**
 * Speed conversion — pure, DOM-free logic (unit-tested in `test/`).
 * Routes through metres per second (the base unit).
 */
import { convertLinear, convertLinearAll, type LinearUnit } from './linear'

export type SpeedUnit = 'mps' | 'kmh' | 'mph' | 'fps' | 'kn'

export const SPEED_UNITS: LinearUnit<SpeedUnit>[] = [
  { unit: 'mps', name: 'Metres per second', symbol: 'm/s', factor: 1, group: 'Metric' },
  {
    unit: 'kmh',
    name: 'Kilometres per hour',
    symbol: 'km/h',
    factor: 1000 / 3600,
    group: 'Metric',
  },
  { unit: 'mph', name: 'Miles per hour', symbol: 'mph', factor: 0.44704, group: 'Imperial / US' },
  { unit: 'fps', name: 'Feet per second', symbol: 'ft/s', factor: 0.3048, group: 'Imperial / US' },
  { unit: 'kn', name: 'Knot', symbol: 'kn', factor: 1852 / 3600, group: 'Nautical' },
]

export function convertSpeed(value: number, from: SpeedUnit, to: SpeedUnit): number {
  return convertLinear(value, from, to, SPEED_UNITS)
}

export function convertSpeedToAll(value: number, from: SpeedUnit) {
  return convertLinearAll(value, from, SPEED_UNITS)
}

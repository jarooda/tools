/**
 * Data-storage conversion — pure, DOM-free logic (unit-tested in `test/`).
 * Routes through bytes (the base unit). Covers bits, decimal SI units
 * (KB = 1000 B) and binary IEC units (KiB = 1024 B) so the two families
 * don't get conflated.
 */
import { convertLinear, convertLinearAll, type LinearUnit } from './linear'

export type DataUnit =
  'bit' | 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB' | 'KiB' | 'MiB' | 'GiB' | 'TiB' | 'PiB'

export const DATA_UNITS: LinearUnit<DataUnit>[] = [
  { unit: 'bit', name: 'Bit', symbol: 'bit', factor: 0.125, group: 'Bits' },
  { unit: 'B', name: 'Byte', symbol: 'B', factor: 1, group: 'Decimal (SI)' },
  { unit: 'KB', name: 'Kilobyte', symbol: 'KB', factor: 1e3, group: 'Decimal (SI)' },
  { unit: 'MB', name: 'Megabyte', symbol: 'MB', factor: 1e6, group: 'Decimal (SI)' },
  { unit: 'GB', name: 'Gigabyte', symbol: 'GB', factor: 1e9, group: 'Decimal (SI)' },
  { unit: 'TB', name: 'Terabyte', symbol: 'TB', factor: 1e12, group: 'Decimal (SI)' },
  { unit: 'PB', name: 'Petabyte', symbol: 'PB', factor: 1e15, group: 'Decimal (SI)' },
  { unit: 'KiB', name: 'Kibibyte', symbol: 'KiB', factor: 1024, group: 'Binary (IEC)' },
  { unit: 'MiB', name: 'Mebibyte', symbol: 'MiB', factor: 1024 ** 2, group: 'Binary (IEC)' },
  { unit: 'GiB', name: 'Gibibyte', symbol: 'GiB', factor: 1024 ** 3, group: 'Binary (IEC)' },
  { unit: 'TiB', name: 'Tebibyte', symbol: 'TiB', factor: 1024 ** 4, group: 'Binary (IEC)' },
  { unit: 'PiB', name: 'Pebibyte', symbol: 'PiB', factor: 1024 ** 5, group: 'Binary (IEC)' },
]

export function convertData(value: number, from: DataUnit, to: DataUnit): number {
  return convertLinear(value, from, to, DATA_UNITS)
}

export function convertToAll(value: number, from: DataUnit) {
  return convertLinearAll(value, from, DATA_UNITS)
}

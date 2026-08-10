/**
 * Bandwidth / download-time math — pure, DOM-free logic (unit-tested in `test/`).
 * File sizes route through the same decimal byte factors as `data-storage.ts`
 * (KB = 1000 B) so the two tools stay consistent; connection speeds are bits
 * per second and get divided by 8 to land in bytes/sec before dividing.
 */
import { DATA_UNITS, type DataUnit } from './data-storage'

export type SizeUnit = 'KB' | 'MB' | 'GB' | 'TB'
export type SpeedUnit = 'Kbps' | 'Mbps' | 'Gbps'

function bytesPerUnit(unit: SizeUnit): number {
  return DATA_UNITS.find((u) => u.unit === (unit as DataUnit))!.factor
}

const BITS_PER_UNIT: Record<SpeedUnit, number> = {
  Kbps: 1e3,
  Mbps: 1e6,
  Gbps: 1e9,
}

/**
 * Estimated download time in seconds, or `null` when either input is zero,
 * negative, or not a finite number.
 */
export function calcDownloadSeconds(
  sizeValue: number,
  sizeUnit: SizeUnit,
  speedValue: number,
  speedUnit: SpeedUnit,
): number | null {
  if (!Number.isFinite(sizeValue) || sizeValue <= 0) return null
  if (!Number.isFinite(speedValue) || speedValue <= 0) return null

  const sizeInBytes = sizeValue * bytesPerUnit(sizeUnit)
  const speedInBytesPerSec = (speedValue * BITS_PER_UNIT[speedUnit]) / 8

  return sizeInBytes / speedInBytesPerSec
}

/**
 * Format a duration in seconds like "45 sec", "2 min 34 sec", or "3 hr 12 min"
 * — the two most significant units. Caps at hours, which comfortably covers
 * even dial-up-sized downloads for this calculator's realistic inputs.
 */
export function humanizeDuration(seconds: number): string {
  const total = Math.round(Math.max(0, seconds))

  if (total < 60) return `${total} sec`

  if (total < 3600) {
    const min = Math.floor(total / 60)
    const sec = total % 60
    return sec === 0 ? `${min} min` : `${min} min ${sec} sec`
  }

  const hr = Math.floor(total / 3600)
  const min = Math.floor((total % 3600) / 60)
  return min === 0 ? `${hr} hr` : `${hr} hr ${min} min`
}

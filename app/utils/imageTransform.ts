/**
 * Pure helpers for the rotate/flip tool. DOM-free and unit-tested; the page
 * applies the matching canvas transform (translate/rotate/scale).
 */

/** Rotation in degrees, restricted to the four right angles. */
export type Rotation = 0 | 90 | 180 | 270

/** Normalise any degree value to the nearest of 0/90/180/270. */
export function normalizeRotation(deg: number): Rotation {
  const r = (((Math.round(deg / 90) * 90) % 360) + 360) % 360
  return r as Rotation
}

/** Add a delta (e.g. ±90) to a rotation, wrapping within 0–270. */
export function rotateBy(current: Rotation, delta: number): Rotation {
  return normalizeRotation(current + delta)
}

/** Canvas dimensions after rotation — width/height swap at 90° and 270°. */
export function rotatedDimensions(
  width: number,
  height: number,
  rotation: Rotation,
): { width: number; height: number } {
  return rotation === 90 || rotation === 270 ? { width: height, height: width } : { width, height }
}

/**
 * Pure rectangle math for the crop tool. DOM-free and unit-tested; the page
 * captures drag points and scales the result before cutting the canvas.
 */

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** Build a positive-sized rect from two (possibly reversed) corner points. */
export function normalizeRect(x0: number, y0: number, x1: number, y1: number): Rect {
  return {
    x: Math.min(x0, x1),
    y: Math.min(y0, y1),
    width: Math.abs(x1 - x0),
    height: Math.abs(y1 - y0),
  }
}

/** Clamp a rect so it stays fully inside a `width`×`height` image. */
export function clampRect(rect: Rect, width: number, height: number): Rect {
  const x = Math.max(0, Math.min(rect.x, width))
  const y = Math.max(0, Math.min(rect.y, height))
  return {
    x,
    y,
    width: Math.max(0, Math.min(rect.width, width - x)),
    height: Math.max(0, Math.min(rect.height, height - y)),
  }
}

/** Scale a rect from display pixels to natural image pixels, then round. */
export function scaleRect(rect: Rect, factor: number): Rect {
  return {
    x: Math.round(rect.x * factor),
    y: Math.round(rect.y * factor),
    width: Math.round(rect.width * factor),
    height: Math.round(rect.height * factor),
  }
}

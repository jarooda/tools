/**
 * Pure aspect-ratio math for the image resize tool. DOM-free and unit-tested;
 * the page draws the source into a canvas of the returned size.
 */

export interface Dimensions {
  width: number
  height: number
}

/** Round to a whole pixel, clamped to at least 1. */
function px(n: number): number {
  return Math.max(1, Math.round(n))
}

/** Height that preserves the original ratio for a chosen `width`. */
export function resizeToWidth(origW: number, origH: number, width: number): Dimensions {
  return { width: px(width), height: px((width * origH) / origW) }
}

/** Width that preserves the original ratio for a chosen `height`. */
export function resizeToHeight(origW: number, origH: number, height: number): Dimensions {
  return { width: px((height * origW) / origH), height: px(height) }
}

/** Both dimensions scaled by a percentage (100 = original size). */
export function resizeByPercent(origW: number, origH: number, percent: number): Dimensions {
  const f = percent / 100
  return { width: px(origW * f), height: px(origH * f) }
}

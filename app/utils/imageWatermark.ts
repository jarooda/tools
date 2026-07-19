/**
 * Pure geometry for placing a text watermark on a canvas. DOM-free so it can be
 * unit-tested; the page feeds the result into `ctx.textAlign`/`textBaseline`
 * and `ctx.fillText(text, x, y)`.
 */

export type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export interface WatermarkPlacement {
  x: number
  y: number
  align: 'left' | 'center' | 'right'
  baseline: 'top' | 'middle' | 'bottom'
}

/** The nine anchor positions, in reading order — handy for building a picker. */
export const WATERMARK_POSITIONS: WatermarkPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]

/**
 * Where to draw the watermark on a `width`×`height` canvas for a given anchor,
 * insetting `margin` px from the edges. Returns the draw point plus the
 * `textAlign`/`textBaseline` that make the text sit inside that corner.
 */
export function watermarkPlacement(
  width: number,
  height: number,
  position: WatermarkPosition,
  margin = 0,
): WatermarkPlacement {
  const [vertical, horizontal] = splitPosition(position)

  let x: number
  let align: WatermarkPlacement['align']
  if (horizontal === 'left') {
    x = margin
    align = 'left'
  } else if (horizontal === 'right') {
    x = width - margin
    align = 'right'
  } else {
    x = width / 2
    align = 'center'
  }

  let y: number
  let baseline: WatermarkPlacement['baseline']
  if (vertical === 'top') {
    y = margin
    baseline = 'top'
  } else if (vertical === 'bottom') {
    y = height - margin
    baseline = 'bottom'
  } else {
    y = height / 2
    baseline = 'middle'
  }

  return { x, y, align, baseline }
}

/** Split an anchor into its vertical + horizontal parts (`center` → middle/center). */
function splitPosition(position: WatermarkPosition): [string, string] {
  if (position === 'center') return ['middle', 'center']
  const [v, h] = position.split('-')
  return [v!, h!]
}

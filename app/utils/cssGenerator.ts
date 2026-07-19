/**
 * CSS `box-shadow` & gradient string builders — pure, DOM-free logic
 * (unit-tested in `test/`). Names are unique across `app/utils/` for auto-import
 * (`gradientCss` here is distinct from palette's `linearGradientCss`).
 */
import { hexToRgb } from '@/utils/colorConvert'

export interface BoxShadowOptions {
  offsetX: number
  offsetY: number
  blur: number
  spread: number
  color: string
  inset: boolean
}

/** Build a `box-shadow` value string. */
export function boxShadowCss(o: BoxShadowOptions): string {
  const parts = [`${o.offsetX}px`, `${o.offsetY}px`, `${o.blur}px`, `${o.spread}px`, o.color]
  return (o.inset ? 'inset ' : '') + parts.join(' ')
}

export type GradientType = 'linear' | 'radial'

export interface GradientStop {
  color: string
  /** Position along the gradient, 0–100 (%). */
  pos: number
}

export interface GradientOptions {
  type: GradientType
  /** Angle in degrees (linear only). */
  angle: number
  stops: GradientStop[]
}

/** Build a `linear-gradient(...)` / `radial-gradient(...)` value string. */
export function gradientCss(o: GradientOptions): string {
  const stops = o.stops.map((s) => `${s.color} ${Math.round(s.pos)}%`).join(', ')
  return o.type === 'linear'
    ? `linear-gradient(${Math.round(o.angle)}deg, ${stops})`
    : `radial-gradient(circle, ${stops})`
}

/** Convert a hex colour + alpha (0–1) to an `rgba(...)` string. */
export function rgbaCss(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 }
  const a = Math.max(0, Math.min(1, alpha))
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Number(a.toFixed(2))})`
}

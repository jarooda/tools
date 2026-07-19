/**
 * Colour-palette & gradient generation — pure, DOM-free logic (unit-tested).
 * Builds harmonious swatch sets from a base colour by rotating hue / shifting
 * lightness in HSL space, then returns them as hex strings.
 */
import { rgbToHsl } from '@/utils/colorFormat'
import { hslToHex, parseColor } from '@/utils/colorConvert'

export type PaletteScheme =
  'complementary' | 'analogous' | 'triadic' | 'tetradic' | 'monochromatic' | 'shades'

export const PALETTE_SCHEMES: { value: PaletteScheme; label: string }[] = [
  { value: 'complementary', label: 'Complementary' },
  { value: 'analogous', label: 'Analogous' },
  { value: 'triadic', label: 'Triadic' },
  { value: 'tetradic', label: 'Tetradic' },
  { value: 'monochromatic', label: 'Monochromatic' },
  { value: 'shades', label: 'Shades' },
]

const clampPct = (n: number) => Math.max(0, Math.min(100, n))

/**
 * Build a palette of hex colours from a base colour string and scheme.
 * Falls back to an empty array if the base colour can't be parsed.
 */
export function buildPalette(base: string, scheme: PaletteScheme): string[] {
  const rgb = parseColor(base)
  if (!rgb) return []
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b)

  const rotate = (deg: number) => hslToHex(h + deg, s, l)

  switch (scheme) {
    case 'complementary':
      return [hslToHex(h, s, l), rotate(180)]
    case 'analogous':
      return [rotate(-30), hslToHex(h, s, l), rotate(30)]
    case 'triadic':
      return [hslToHex(h, s, l), rotate(120), rotate(240)]
    case 'tetradic':
      return [hslToHex(h, s, l), rotate(90), rotate(180), rotate(270)]
    case 'monochromatic':
      return [20, 35, 50, 65, 80].map((li) => hslToHex(h, s, li))
    case 'shades':
      return [10, 25, 40, 55, 70, 85].map((li) => hslToHex(h, s, li))
    default:
      return [hslToHex(h, s, l)]
  }
}

/** A CSS `linear-gradient(...)` string between two colours at `angle` degrees. */
export function linearGradientCss(from: string, to: string, angle = 90): string {
  return `linear-gradient(${Math.round(angle)}deg, ${from}, ${to})`
}

/**
 * Evenly stepped shades of a single colour, from dark to light — handy for a
 * quick tonal ramp. `steps` is clamped to 2–12.
 */
export function shadeRamp(base: string, steps = 6): string[] {
  const rgb = parseColor(base)
  if (!rgb) return []
  const { h, s } = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const n = Math.max(2, Math.min(12, Math.floor(steps)))
  return Array.from({ length: n }, (_v, i) => hslToHex(h, s, clampPct(12 + (i * 76) / (n - 1))))
}

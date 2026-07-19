/**
 * Colour parsing & conversion — pure, DOM-free logic (unit-tested in `test/`).
 * Complements `colorFormat.ts` (which owns `rgbToHex` / `rgbToHsl`) with the
 * inverse directions (`hexToRgb`, `hslToRgb`) and a lenient string parser.
 * Names are unique across `app/utils/` so Nuxt auto-import stays unambiguous.
 */
import { rgbToHex, rgbToHsl, type Rgb, type Hsl } from '@/utils/colorFormat'

export type { Rgb, Hsl }

const clampByte = (n: number) => Math.max(0, Math.min(255, Math.round(n)))

/** `"#ff0000"` / `"f00"` / `"#FF0000"` → `{ r, g, b }`, or `null` if invalid. */
export function hexToRgb(input: string): Rgb | null {
  const h = input.trim().replace(/^#/, '')
  let full: string
  if (/^[0-9a-f]{3}$/i.test(h)) {
    full = h
      .split('')
      .map((c) => c + c)
      .join('')
  } else if (/^[0-9a-f]{6}$/i.test(h)) {
    full = h
  } else {
    return null
  }
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

/** `(0, 100, 50)` → `{ r: 255, g: 0, b: 0 }` (h in degrees, s/l in percent). */
export function hslToRgb(h: number, s: number, l: number): Rgb {
  const hn = ((h % 360) + 360) % 360
  const sn = Math.max(0, Math.min(100, s)) / 100
  const ln = Math.max(0, Math.min(100, l)) / 100

  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1))
  const m = ln - c / 2

  let r = 0
  let g = 0
  let b = 0
  if (hn < 60) [r, g, b] = [c, x, 0]
  else if (hn < 120) [r, g, b] = [x, c, 0]
  else if (hn < 180) [r, g, b] = [0, c, x]
  else if (hn < 240) [r, g, b] = [0, x, c]
  else if (hn < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]

  return { r: clampByte((r + m) * 255), g: clampByte((g + m) * 255), b: clampByte((b + m) * 255) }
}

/** `{ h, s, l }` → `"#rrggbb"`. */
export function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, s, l)
  return rgbToHex(r, g, b)
}

const num = String.raw`\s*(-?\d*\.?\d+)\s*`
const RGB_RE = new RegExp(String.raw`^rgba?\(${num},${num},${num}(?:,${num})?\)$`, 'i')
const HSL_RE = new RegExp(String.raw`^hsla?\(${num},${num}%?,${num}%?(?:,${num})?\)$`, 'i')

/**
 * Parse a HEX, `rgb()/rgba()`, or `hsl()/hsla()` string into `{ r, g, b }`.
 * Returns `null` for anything it can't understand.
 */
export function parseColor(input: string): Rgb | null {
  const s = input.trim()
  const hex = hexToRgb(s)
  if (hex) return hex

  const rgb = RGB_RE.exec(s)
  if (rgb) {
    return { r: clampByte(+rgb[1]!), g: clampByte(+rgb[2]!), b: clampByte(+rgb[3]!) }
  }

  const hsl = HSL_RE.exec(s)
  if (hsl) {
    return hslToRgb(+hsl[1]!, +hsl[2]!, +hsl[3]!)
  }
  return null
}

/** Convenience: parse any supported string, or `null`. */
export function parseToHsl(input: string): Hsl | null {
  const rgb = parseColor(input)
  return rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null
}

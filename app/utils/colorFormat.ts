/**
 * Pure RGB → HEX / HSL conversion for the image color picker. DOM-free and
 * unit-tested. (Phase 5's dedicated colour tool can build on the same helpers.)
 */

export interface Rgb {
  r: number
  g: number
  b: number
}

export interface Hsl {
  h: number
  s: number
  l: number
}

const clampByte = (n: number) => Math.max(0, Math.min(255, Math.round(n)))

/** `(255, 0, 0)` → `"#FF0000"`. */
export function rgbToHex(r: number, g: number, b: number): string {
  const hex = (n: number) => clampByte(n).toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase()
}

/** `(255, 0, 0)` → `{ h: 0, s: 100, l: 50 }` (degrees + percentages, rounded). */
export function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rn = clampByte(r) / 255
  const gn = clampByte(g) / 255
  const bn = clampByte(b) / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  const l = (max + min) / 2

  let h = 0
  let s = 0
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case rn:
        h = ((gn - bn) / delta) % 6
        break
      case gn:
        h = (bn - rn) / delta + 2
        break
      default:
        h = (rn - gn) / delta + 4
    }
    h *= 60
    if (h < 0) h += 360
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

/** `"hsl(0, 100%, 50%)"` string form. */
export function hslString({ h, s, l }: Hsl): string {
  return `hsl(${h}, ${s}%, ${l}%)`
}

/** `"rgb(255, 0, 0)"` string form. */
export function rgbString({ r, g, b }: Rgb): string {
  return `rgb(${clampByte(r)}, ${clampByte(g)}, ${clampByte(b)})`
}

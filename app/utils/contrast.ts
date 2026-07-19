/**
 * WCAG colour-contrast maths — pure, DOM-free logic (unit-tested in `test/`).
 * Implements the relative-luminance and contrast-ratio formulas from WCAG 2.1
 * and the AA/AAA pass thresholds.
 */
import type { Rgb } from '@/utils/colorFormat'

/** Linearise a single 0–255 sRGB channel. */
function linearize(c: number): number {
  const s = Math.max(0, Math.min(255, c)) / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

/** Relative luminance of a colour (0 = black, 1 = white). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

/** Contrast ratio between two colours, from 1:1 to 21:1. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

export interface WcagResult {
  /** AA for normal text (≥ 4.5). */
  aaNormal: boolean
  /** AA for large text ≥ 18pt / 14pt bold (≥ 3). */
  aaLarge: boolean
  /** AAA for normal text (≥ 7). */
  aaaNormal: boolean
  /** AAA for large text (≥ 4.5). */
  aaaLarge: boolean
}

/** Which WCAG levels a given contrast ratio satisfies. */
export function wcagCompliance(ratio: number): WcagResult {
  return {
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  }
}

/** Format a ratio like `4.53:1` (2 decimals). */
export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`
}

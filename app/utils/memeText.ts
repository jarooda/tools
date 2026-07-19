/**
 * Pure word-wrap for the meme caption tool. Text measurement is injected as a
 * callback so the logic stays DOM-free and unit-testable; the page passes
 * `(s) => ctx.measureText(s).width`.
 */

/**
 * Break `text` into lines that each fit within `maxWidth`, greedily by word.
 * A single word wider than `maxWidth` still gets its own line (never dropped).
 */
export function wrapLines(
  text: string,
  maxWidth: number,
  measure: (s: string) => number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []

  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (current && measure(candidate) > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

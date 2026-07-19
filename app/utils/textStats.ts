/**
 * Text statistics — pure, DOM-free logic (unit-tested in `test/`).
 * Counts characters, words, sentences, lines, paragraphs and estimates
 * reading time. Unique export names avoid Nuxt auto-import clashes.
 */

export interface TextStats {
  characters: number
  charactersNoSpaces: number
  words: number
  sentences: number
  lines: number
  paragraphs: number
  /** Estimated reading time in seconds at ~200 wpm. */
  readingSeconds: number
}

/** Words per minute used for the reading-time estimate. */
export const READING_WPM = 200

/** Compute counts for a block of text. Empty string yields all zeros. */
export function computeTextStats(text: string): TextStats {
  const characters = [...text].length
  const charactersNoSpaces = [...text.replace(/\s/gu, '')].length
  const trimmed = text.trim()

  const words = trimmed === '' ? 0 : trimmed.split(/\s+/u).length

  // Count runs of terminal punctuation, plus a trailing run of text without one.
  const terminators = trimmed.match(/[.!?…]+/gu) ?? []
  const afterLast = trimmed.replace(/^[\s\S]*[.!?…]+/u, '')
  let sentences = terminators.length
  if (afterLast.trim() !== '') sentences += 1

  const lines = text === '' ? 0 : text.split(/\r\n|\r|\n/u).length

  const paragraphs =
    trimmed === '' ? 0 : trimmed.split(/(?:\r\n|\r|\n){2,}/u).filter((p) => p.trim() !== '').length

  const readingSeconds = Math.round((words / READING_WPM) * 60)

  return {
    characters,
    charactersNoSpaces,
    words,
    sentences,
    lines,
    paragraphs,
    readingSeconds,
  }
}

/** Format a reading-time estimate like "1 min 5 sec" or "12 sec". */
export function formatReadingTime(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return sec === 0 ? `${min} min` : `${min} min ${sec} sec`
}

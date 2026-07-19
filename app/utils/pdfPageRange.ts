/**
 * Pure, DOM-free parsing of human page-range specs like `"1-3, 5, 8-10"`.
 * Shared by the Split, Organize, and Extract-text PDF tools. 1-based throughout
 * (as users type it); pdf-lib/pdf.js callers convert to 0-based where needed.
 *
 * Export names are prefixed `parsePdf…` to stay globally unique among the
 * auto-imported `app/utils/` modules.
 */

/** Thrown for malformed or out-of-bounds specs, with a user-facing message. */
export class PdfPageRangeError extends Error {}

/** Parse one segment (`"5"` or `"3-7"`) into an inclusive 1-based page list. */
function parseSegment(segment: string, total: number): number[] {
  const seg = segment.trim()
  if (!seg) return []

  const dash = seg.match(/^(\d+)\s*-\s*(\d*)$/)
  if (dash) {
    const start = Number(dash[1])
    const end = dash[2] === '' ? total : Number(dash[2])
    if (start < 1 || end > total || start > end) {
      throw new PdfPageRangeError(`Range "${seg}" is out of bounds (1–${total}).`)
    }
    const out: number[] = []
    for (let p = start; p <= end; p++) out.push(p)
    return out
  }

  if (/^\d+$/.test(seg)) {
    const page = Number(seg)
    if (page < 1 || page > total) {
      throw new PdfPageRangeError(`Page ${page} is out of bounds (1–${total}).`)
    }
    return [page]
  }

  throw new PdfPageRangeError(`"${seg}" is not a valid page or range.`)
}

/**
 * Flatten a spec into a de-duplicated, ascending list of 1-based page numbers.
 * E.g. `"3-1"` throws; `"1-2, 2, 5"` → `[1, 2, 5]`. Empty spec → `[]`.
 */
export function parsePdfPageList(spec: string, total: number): number[] {
  const seen = new Set<number>()
  for (const segment of spec.split(',')) {
    for (const page of parseSegment(segment, total)) seen.add(page)
  }
  return [...seen].sort((a, b) => a - b)
}

/**
 * Parse a spec into one group per comma segment, preserving user order and
 * duplicates within a segment removed. Used by Split to emit one PDF per group.
 * E.g. `"1-2, 5, 7-8"` → `[[1,2],[5],[7,8]]`.
 */
export function parsePdfPageGroups(spec: string, total: number): number[][] {
  const groups: number[][] = []
  for (const segment of spec.split(',')) {
    if (!segment.trim()) continue
    const pages = [...new Set(parseSegment(segment, total))]
    if (pages.length) groups.push(pages)
  }
  if (!groups.length) throw new PdfPageRangeError('Enter at least one page or range.')
  return groups
}

/**
 * Split `total` pages into fixed-size chunks (1-based page groups).
 * E.g. `total=5, size=2` → `[[1,2],[3,4],[5]]`.
 */
export function parsePdfChunks(total: number, size: number): number[][] {
  if (size < 1) throw new PdfPageRangeError('Chunk size must be at least 1.')
  const groups: number[][] = []
  for (let start = 1; start <= total; start += size) {
    const group: number[] = []
    for (let p = start; p < start + size && p <= total; p++) group.push(p)
    groups.push(group)
  }
  return groups
}

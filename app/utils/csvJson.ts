/**
 * CSV ↔ JSON conversion — pure, DOM-free logic (unit-tested in `test/`).
 * Includes an RFC-4180-style CSV parser that handles quoted fields, escaped
 * quotes (""), and delimiters/newlines inside quotes.
 */

/** Parse CSV text into a matrix of string cells. */
export function parseCsv(text: string, delimiter = ','): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  const pushField = () => {
    row.push(field)
    field = ''
  }
  const pushRow = () => {
    pushField()
    rows.push(row)
    row = []
  }

  while (i < text.length) {
    const ch = text[i]!
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }
    if (ch === '"') {
      inQuotes = true
      i++
    } else if (ch === delimiter) {
      pushField()
      i++
    } else if (ch === '\n') {
      pushRow()
      i++
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') i++
      pushRow()
      i++
    } else {
      field += ch
      i++
    }
  }
  // Flush the final field/row unless the text ended on a clean newline.
  if (field !== '' || row.length > 0) pushRow()
  return rows
}

/** Convert CSV to a JSON array. With `header`, rows become keyed objects. */
export function csvToJson(
  csv: string,
  opts: { delimiter?: string; header?: boolean } = {},
): string {
  const delimiter = opts.delimiter ?? ','
  const header = opts.header ?? true
  const rows = parseCsv(csv, delimiter).filter((r) => !(r.length === 1 && r[0] === ''))
  if (rows.length === 0) return '[]'

  if (!header) return JSON.stringify(rows, null, 2)

  const keys = rows[0]!
  const objects = rows.slice(1).map((r) => {
    const obj: Record<string, string> = {}
    keys.forEach((k, idx) => {
      obj[k] = r[idx] ?? ''
    })
    return obj
  })
  return JSON.stringify(objects, null, 2)
}

/** Escape a single CSV cell, quoting it when necessary. */
function escapeCell(value: unknown, delimiter: string): string {
  const s = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
  if (s.includes('"') || s.includes(delimiter) || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/** Convert a JSON array (of objects or arrays) to CSV. Throws on bad input. */
export function jsonToCsv(jsonText: string, opts: { delimiter?: string } = {}): string {
  const delimiter = opts.delimiter ?? ','
  let data: unknown
  try {
    data = JSON.parse(jsonText)
  } catch {
    throw new Error('Input is not valid JSON')
  }
  if (!Array.isArray(data)) throw new Error('JSON must be an array of rows')
  if (data.length === 0) return ''

  // Array of arrays → straight rows.
  if (data.every((r) => Array.isArray(r))) {
    return (data as unknown[][])
      .map((r) => r.map((c) => escapeCell(c, delimiter)).join(delimiter))
      .join('\n')
  }

  // Array of objects → union of keys as the header.
  const keys: string[] = []
  for (const item of data) {
    if (item && typeof item === 'object') {
      for (const k of Object.keys(item)) if (!keys.includes(k)) keys.push(k)
    }
  }
  const headerLine = keys.map((k) => escapeCell(k, delimiter)).join(delimiter)
  const lines = (data as Record<string, unknown>[]).map((obj) =>
    keys.map((k) => escapeCell(obj?.[k], delimiter)).join(delimiter),
  )
  return [headerLine, ...lines].join('\n')
}

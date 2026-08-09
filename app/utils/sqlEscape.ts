/**
 * SQL string literal escape/unescape — pure, DOM-free logic (unit-tested in
 * `test/`). Handles the standard single-quote-doubling convention shared by
 * MySQL, PostgreSQL, and SQLite.
 */

/** Double every `'` and wrap the result in surrounding single quotes. */
export function escapeSql(text: string): string {
  return `'${text.replace(/'/g, "''")}'`
}

/** Strip one layer of surrounding single quotes if present, then undouble `''` to `'`. Never throws. */
export function unescapeSql(text: string): string {
  const stripped =
    text.length >= 2 && text.startsWith("'") && text.endsWith("'") ? text.slice(1, -1) : text
  return stripped.replace(/''/g, "'")
}

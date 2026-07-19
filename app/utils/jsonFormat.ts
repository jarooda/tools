/**
 * JSON format / validate / minify — pure, DOM-free logic (unit-tested in `test/`).
 * Parses with the native JSON parser and, on failure, reports a friendly
 * message with the 1-based line and column of the error.
 */

export interface JsonError {
  message: string
  line?: number
  column?: number
}

export interface JsonResult {
  output: string
  error: JsonError | null
}

/** Convert a character offset into 1-based line/column numbers. */
function positionToLineCol(text: string, pos: number): { line: number; column: number } {
  let line = 1
  let column = 1
  for (let i = 0; i < pos && i < text.length; i++) {
    if (text[i] === '\n') {
      line++
      column = 1
    } else {
      column++
    }
  }
  return { line, column }
}

function toJsonError(text: string, e: unknown): JsonError {
  const message = e instanceof Error ? e.message : 'Invalid JSON'
  // Some engines embed "(line X column Y)"; most embed "at position N".
  const lc = message.match(/line (\d+) column (\d+)/i)
  if (lc) return { message, line: Number(lc[1]), column: Number(lc[2]) }
  const pos = message.match(/position (\d+)/i)
  if (pos) {
    const { line, column } = positionToLineCol(text, Number(pos[1]))
    return { message, line, column }
  }
  return { message }
}

/** Indent size or a literal `\t` marker for tab indentation. */
export type JsonIndent = 2 | 4 | 'tab'

function indentValue(indent: JsonIndent): string | number {
  return indent === 'tab' ? '\t' : indent
}

/** Pretty-print JSON with the given indentation. */
export function formatJson(text: string, indent: JsonIndent = 2): JsonResult {
  if (text.trim() === '') return { output: '', error: null }
  try {
    const parsed: unknown = JSON.parse(text)
    return { output: JSON.stringify(parsed, null, indentValue(indent)), error: null }
  } catch (e) {
    return { output: '', error: toJsonError(text, e) }
  }
}

/** Minify JSON to a single line. */
export function minifyJson(text: string): JsonResult {
  if (text.trim() === '') return { output: '', error: null }
  try {
    const parsed: unknown = JSON.parse(text)
    return { output: JSON.stringify(parsed), error: null }
  } catch (e) {
    return { output: '', error: toJsonError(text, e) }
  }
}

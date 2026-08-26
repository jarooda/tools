/**
 * Code formatter / beautifier — pure, DOM-free logic (unit-tested in `test/`).
 * JavaScript/HTML/CSS/JSON go through `prettier/standalone` with its bundled
 * parser plugins; SQL goes through `sql-formatter` (Prettier has no SQL
 * support). Both are lazy-imported so the bundle only pays for the language
 * actually in use.
 */

export type CodeLanguage = 'javascript' | 'html' | 'css' | 'json' | 'sql'

/** Indent size or a literal tab marker. SQL ignores this (see `formatCode`). */
export type CodeIndent = 2 | 4 | 'tab'

export interface CodeFormatError {
  message: string
  line?: number
  column?: number
}

export interface CodeFormatResult {
  output: string
  error: CodeFormatError | null
}

interface PrettierLoc {
  loc?: { start?: { line?: number; column?: number } }
}

function fromPrettierError(e: unknown): CodeFormatError {
  const err = e as (Error & PrettierLoc) | undefined
  const raw = err instanceof Error ? err.message : 'Formatting failed'
  const message = raw.replace(/\s*\(\d+:\d+\)\s*$/, '').trim()
  const start = err?.loc?.start
  if (start?.line != null && start?.column != null) {
    return { message, line: start.line, column: start.column }
  }
  return { message }
}

function fromSqlFormatterError(e: unknown): CodeFormatError {
  const raw = e instanceof Error ? e.message : 'Formatting failed'
  const firstLine = raw.split('\n')[0] ?? raw
  const m = firstLine.match(/^(.*?)\s+at line (\d+) column (\d+)$/)
  if (m) return { message: m[1]!, line: Number(m[2]), column: Number(m[3]) }
  return { message: firstLine }
}

async function formatWithPrettier(text: string, language: CodeLanguage, indent: CodeIndent) {
  const { format } = await import('prettier/standalone')
  const [babel, estree] = await Promise.all([
    import('prettier/plugins/babel').then((m) => m.default),
    import('prettier/plugins/estree').then((m) => m.default),
  ])

  const tabWidth = indent === 'tab' ? 2 : indent
  const useTabs = indent === 'tab'

  if (language === 'json') {
    return format(text, { parser: 'json', plugins: [babel, estree], tabWidth, useTabs })
  }
  if (language === 'javascript') {
    return format(text, { parser: 'babel', plugins: [babel, estree], tabWidth, useTabs })
  }
  if (language === 'css') {
    const postcss = await import('prettier/plugins/postcss').then((m) => m.default)
    return format(text, { parser: 'css', plugins: [postcss], tabWidth, useTabs })
  }
  const [html, postcss] = await Promise.all([
    import('prettier/plugins/html').then((m) => m.default),
    import('prettier/plugins/postcss').then((m) => m.default),
  ])
  return format(text, {
    parser: 'html',
    plugins: [html, babel, estree, postcss],
    tabWidth,
    useTabs,
  })
}

async function formatWithSqlFormatter(text: string) {
  const { format } = await import('sql-formatter')
  return format(text, { language: 'sql', tabWidth: 2, useTabs: false })
}

/** Format source code for the given language. SQL ignores `indent`. */
export async function formatCode(
  text: string,
  language: CodeLanguage,
  indent: CodeIndent = 2,
): Promise<CodeFormatResult> {
  if (text.trim() === '') return { output: '', error: null }
  try {
    const output =
      language === 'sql'
        ? await formatWithSqlFormatter(text)
        : await formatWithPrettier(text, language, indent)
    return { output, error: null }
  } catch (e) {
    const error = language === 'sql' ? fromSqlFormatterError(e) : fromPrettierError(e)
    return { output: '', error }
  }
}

/**
 * Code minifier — pure, DOM-free logic (unit-tested in `test/`).
 * JavaScript goes through `terser`, CSS through `csso`, HTML through
 * `html-minifier-terser` (which also minifies inline `<script>`/`<style>` via
 * terser/csso). All three are lazy-imported so the bundle only pays for the
 * minifier actually in use.
 */

export type MinifyLanguage = 'javascript' | 'css' | 'html'

export interface CodeMinifyError {
  message: string
  line?: number
  column?: number
}

export interface CodeMinifyStats {
  inputBytes: number
  outputBytes: number
}

export interface CodeMinifyResult {
  output: string
  error: CodeMinifyError | null
  stats: CodeMinifyStats | null
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

interface TerserLoc {
  line?: number
  col?: number
}

function fromTerserError(e: unknown): CodeMinifyError {
  const err = e as (Error & TerserLoc) | undefined
  const message = err instanceof Error ? err.message : 'Minification failed'
  if (err?.line != null && err?.col != null) {
    return { message, line: err.line, column: err.col }
  }
  return { message }
}

async function minifyJavaScript(text: string): Promise<string> {
  const { minify } = await import('terser')
  const result = await minify(text)
  return result.code ?? ''
}

async function minifyCss(text: string): Promise<string> {
  const { minify } = await import('csso')
  return minify(text).css
}

async function minifyHtml(text: string): Promise<string> {
  const { minify } = await import('html-minifier-terser')
  return minify(text, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    useShortDoctype: true,
    minifyCSS: true,
    minifyJS: true,
  })
}

/** Minify source code for the given language. */
export async function minifyCode(
  text: string,
  language: MinifyLanguage,
): Promise<CodeMinifyResult> {
  if (text.trim() === '') return { output: '', error: null, stats: null }
  try {
    const output =
      language === 'javascript'
        ? await minifyJavaScript(text)
        : language === 'css'
          ? await minifyCss(text)
          : await minifyHtml(text)
    return {
      output,
      error: null,
      stats: { inputBytes: byteLength(text), outputBytes: byteLength(output) },
    }
  } catch (e) {
    const error =
      language === 'javascript'
        ? fromTerserError(e)
        : { message: (e as Error)?.message ?? 'Minification failed' }
    return { output: '', error, stats: null }
  }
}

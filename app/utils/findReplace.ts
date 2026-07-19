/**
 * Find & replace — pure, DOM-free logic (unit-tested in `test/`).
 * Supports plain-text and regular-expression matching with the usual flags.
 */

export interface FindReplaceOptions {
  find: string
  replace: string
  regex?: boolean
  caseInsensitive?: boolean
  /** Replace all matches (default) or just the first. */
  global?: boolean
  /** Match whole words only (plain mode adds \b boundaries). */
  wholeWord?: boolean
  /** In regex mode, let `.` match newlines and `^`/`$` match line ends. */
  multiline?: boolean
}

export interface FindReplaceResult {
  output: string
  /** Number of matches replaced. */
  count: number
}

/** Escape a string so it can be used literally inside a RegExp. */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

/** Build the RegExp for a find/replace run. Throws on an invalid pattern. */
export function buildFindRegExp(opts: FindReplaceOptions): RegExp {
  let source = opts.regex ? opts.find : escapeRegExp(opts.find)
  if (opts.wholeWord) source = `\\b(?:${source})\\b`
  let flags = 'u'
  if (opts.global ?? true) flags += 'g'
  if (opts.caseInsensitive) flags += 'i'
  if (opts.multiline) flags += 'ms'
  return new RegExp(source, flags)
}

/**
 * Apply a find/replace to `text`. Returns the new text and how many matches
 * were replaced. An empty `find` is a no-op. Throws if the regex is invalid.
 */
export function applyFindReplace(text: string, opts: FindReplaceOptions): FindReplaceResult {
  if (opts.find === '') return { output: text, count: 0 }
  const re = buildFindRegExp(opts)

  let count = 0
  const output = text.replace(re, (...args) => {
    count += 1
    // Support $1 backrefs in regex mode; treat replacement literally otherwise.
    if (!opts.regex) return opts.replace
    const groups = args.slice(1, -2) as string[]
    return opts.replace.replace(/\$(\d+|&)/gu, (_m, g: string) => {
      if (g === '&') return String(args[0])
      const idx = Number(g)
      return idx >= 1 && idx <= groups.length ? (groups[idx - 1] ?? '') : `$${g}`
    })
  })

  return { output, count }
}

/**
 * Case conversion — pure, DOM-free logic (unit-tested in `test/`).
 * Splits text into words (handling spaces, punctuation, and camelCase
 * boundaries) then recombines them in the requested case.
 */

export type CaseMode =
  | 'upper'
  | 'lower'
  | 'title'
  | 'sentence'
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'kebab'
  | 'constant'
  | 'dot'
  | 'alternating'
  | 'inverse'

export const CASE_MODES: Array<{ value: CaseMode; label: string; sample: string }> = [
  { value: 'upper', label: 'UPPERCASE', sample: 'HELLO WORLD' },
  { value: 'lower', label: 'lowercase', sample: 'hello world' },
  { value: 'title', label: 'Title Case', sample: 'Hello World' },
  { value: 'sentence', label: 'Sentence case', sample: 'Hello world' },
  { value: 'camel', label: 'camelCase', sample: 'helloWorld' },
  { value: 'pascal', label: 'PascalCase', sample: 'HelloWorld' },
  { value: 'snake', label: 'snake_case', sample: 'hello_world' },
  { value: 'kebab', label: 'kebab-case', sample: 'hello-world' },
  { value: 'constant', label: 'CONSTANT_CASE', sample: 'HELLO_WORLD' },
  { value: 'dot', label: 'dot.case', sample: 'hello.world' },
  { value: 'alternating', label: 'aLtErNaTiNg', sample: 'hELlO wORlD' },
  { value: 'inverse', label: 'iNVERSE', sample: 'hELLO wORLD' },
]

/** Split text into lowercase word tokens, honouring camelCase boundaries. */
export function tokenizeWords(text: string): string[] {
  return (
    text
      // insert a space at lower→upper and letter→digit boundaries
      .replace(/([a-z\d])([A-Z])/gu, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/gu, '$1 $2')
      .split(/[^A-Za-z0-9]+/u)
      .filter(Boolean)
  )
}

function upperFirst(w: string): string {
  return w.charAt(0).toUpperCase() + w.slice(1)
}

/** Convert `text` to the given case mode. */
export function convertCase(text: string, mode: CaseMode): string {
  switch (mode) {
    case 'upper':
      return text.toUpperCase()
    case 'lower':
      return text.toLowerCase()
    case 'alternating':
      return alternate(text, false)
    case 'inverse':
      return invertCase(text)
    case 'sentence':
      return toSentenceCase(text)
    default:
      break
  }

  const words = tokenizeWords(text).map((w) => w.toLowerCase())
  switch (mode) {
    case 'title':
      return words.map(upperFirst).join(' ')
    case 'camel':
      return words.map((w, i) => (i === 0 ? w : upperFirst(w))).join('')
    case 'pascal':
      return words.map(upperFirst).join('')
    case 'snake':
      return words.join('_')
    case 'kebab':
      return words.join('-')
    case 'constant':
      return words.join('_').toUpperCase()
    case 'dot':
      return words.join('.')
    default:
      return text
  }
}

/** Capitalise the first letter of each sentence, lowercasing the rest. */
function toSentenceCase(text: string): string {
  const lower = text.toLowerCase()
  return lower.replace(
    /(^\s*|[.!?…]\s+)([a-z])/gu,
    (_m, lead: string, ch: string) => lead + ch.toUpperCase(),
  )
}

/** Alternate lower/upper across letters, starting from `startUpper`. */
function alternate(text: string, startUpper: boolean): string {
  let upper = startUpper
  let out = ''
  for (const ch of text) {
    if (/[a-z]/iu.test(ch)) {
      out += upper ? ch.toUpperCase() : ch.toLowerCase()
      upper = !upper
    } else {
      out += ch
    }
  }
  return out
}

/** Swap the case of every letter. */
function invertCase(text: string): string {
  let out = ''
  for (const ch of text) {
    if (ch === ch.toUpperCase() && ch !== ch.toLowerCase()) out += ch.toLowerCase()
    else out += ch.toUpperCase()
  }
  return out
}

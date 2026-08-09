/**
 * Regex tester + explainer — pure, DOM-free logic (unit-tested in `test/`).
 * `testRegex` safely compiles and runs a pattern against a test string.
 * `explainPattern` walks the *pattern string itself* (never the test string)
 * with a hand-rolled tokenizer and returns a plain-English breakdown, one row
 * per token, merging adjacent literal characters into a single row.
 */

export interface MatchGroup {
  /** Group name if named (`(?<name>…)`), otherwise its 1-based position. */
  name: string | number
  value: string | undefined
}

export interface RegexMatch {
  match: string
  index: number
  groups: MatchGroup[]
}

export interface RegexTestResult {
  matches: RegexMatch[]
  error: string | null
}

export interface ExplainRow {
  token: string
  description: string
}

/** Safety cap on `g`-flag iterations so a pathological pattern can't hang the tab. */
const MAX_MATCHES = 5000

type TokenKind =
  | 'literal'
  | 'anchor-start'
  | 'anchor-end'
  | 'word-boundary'
  | 'non-word-boundary'
  | 'any'
  | 'digit'
  | 'non-digit'
  | 'word'
  | 'non-word'
  | 'space'
  | 'non-space'
  | 'class'
  | 'quantifier'
  | 'group-open'
  | 'group-close'
  | 'alternation'
  | 'backreference'

type GroupKind =
  | 'capturing'
  | 'named'
  | 'non-capturing'
  | 'lookahead'
  | 'neg-lookahead'
  | 'lookbehind'
  | 'neg-lookbehind'

interface Token {
  raw: string
  kind: TokenKind
  groupKind?: GroupKind
  groupName?: string
  groupNumber?: number
  quantMin?: number
  quantMax?: number | null
  lazy?: boolean
}

/** Hand-rolled tokenizer over a regex *pattern* string (not the subject text). */
function tokenizePattern(pattern: string): Token[] {
  const tokens: Token[] = []
  const n = pattern.length
  let i = 0
  let groupCount = 0

  while (i < n) {
    const ch = pattern[i]!

    if (ch === '\\') {
      const next = pattern[i + 1]
      if (next === undefined) {
        tokens.push({ raw: '\\', kind: 'literal' })
        i++
        continue
      }
      if (next === 'd') {
        tokens.push({ raw: '\\d', kind: 'digit' })
        i += 2
        continue
      }
      if (next === 'D') {
        tokens.push({ raw: '\\D', kind: 'non-digit' })
        i += 2
        continue
      }
      if (next === 'w') {
        tokens.push({ raw: '\\w', kind: 'word' })
        i += 2
        continue
      }
      if (next === 'W') {
        tokens.push({ raw: '\\W', kind: 'non-word' })
        i += 2
        continue
      }
      if (next === 's') {
        tokens.push({ raw: '\\s', kind: 'space' })
        i += 2
        continue
      }
      if (next === 'S') {
        tokens.push({ raw: '\\S', kind: 'non-space' })
        i += 2
        continue
      }
      if (next === 'b') {
        tokens.push({ raw: '\\b', kind: 'word-boundary' })
        i += 2
        continue
      }
      if (next === 'B') {
        tokens.push({ raw: '\\B', kind: 'non-word-boundary' })
        i += 2
        continue
      }
      if (next === 'k' && pattern[i + 2] === '<') {
        const end = pattern.indexOf('>', i + 3)
        if (end !== -1) {
          tokens.push({
            raw: pattern.slice(i, end + 1),
            kind: 'backreference',
            groupName: pattern.slice(i + 3, end),
          })
          i = end + 1
          continue
        }
      }
      if (next >= '1' && next <= '9') {
        let j = i + 1
        while (j < n && pattern[j]! >= '0' && pattern[j]! <= '9') j++
        tokens.push({
          raw: pattern.slice(i, j),
          kind: 'backreference',
          groupNumber: Number(pattern.slice(i + 1, j)),
        })
        i = j
        continue
      }
      // Escaped literal, e.g. `\.`, `\+`, `\n`.
      tokens.push({ raw: pattern.slice(i, i + 2), kind: 'literal' })
      i += 2
      continue
    }

    if (ch === '[') {
      let j = i + 1
      if (pattern[j] === '^') j++
      if (pattern[j] === ']') j++
      while (j < n && pattern[j] !== ']') {
        if (pattern[j] === '\\') j++
        j++
      }
      j = Math.min(j + 1, n)
      tokens.push({ raw: pattern.slice(i, j), kind: 'class' })
      i = j
      continue
    }

    if (ch === '^') {
      tokens.push({ raw: '^', kind: 'anchor-start' })
      i++
      continue
    }
    if (ch === '$') {
      tokens.push({ raw: '$', kind: 'anchor-end' })
      i++
      continue
    }
    if (ch === '.') {
      tokens.push({ raw: '.', kind: 'any' })
      i++
      continue
    }
    if (ch === '|') {
      tokens.push({ raw: '|', kind: 'alternation' })
      i++
      continue
    }
    if (ch === ')') {
      tokens.push({ raw: ')', kind: 'group-close' })
      i++
      continue
    }

    if (ch === '(') {
      if (pattern.startsWith('(?:', i)) {
        tokens.push({ raw: '(?:', kind: 'group-open', groupKind: 'non-capturing' })
        i += 3
        continue
      }
      if (pattern.startsWith('(?=', i)) {
        tokens.push({ raw: '(?=', kind: 'group-open', groupKind: 'lookahead' })
        i += 3
        continue
      }
      if (pattern.startsWith('(?!', i)) {
        tokens.push({ raw: '(?!', kind: 'group-open', groupKind: 'neg-lookahead' })
        i += 3
        continue
      }
      if (pattern.startsWith('(?<=', i)) {
        tokens.push({ raw: '(?<=', kind: 'group-open', groupKind: 'lookbehind' })
        i += 4
        continue
      }
      if (pattern.startsWith('(?<!', i)) {
        tokens.push({ raw: '(?<!', kind: 'group-open', groupKind: 'neg-lookbehind' })
        i += 4
        continue
      }
      if (pattern.startsWith('(?<', i)) {
        const end = pattern.indexOf('>', i + 3)
        if (end !== -1) {
          groupCount++
          tokens.push({
            raw: pattern.slice(i, end + 1),
            kind: 'group-open',
            groupKind: 'named',
            groupName: pattern.slice(i + 3, end),
            groupNumber: groupCount,
          })
          i = end + 1
          continue
        }
      }
      groupCount++
      tokens.push({ raw: '(', kind: 'group-open', groupKind: 'capturing', groupNumber: groupCount })
      i++
      continue
    }

    if (ch === '*' || ch === '+' || ch === '?') {
      let j = i + 1
      let lazy = false
      if (pattern[j] === '?') {
        lazy = true
        j++
      }
      tokens.push({ raw: pattern.slice(i, j), kind: 'quantifier', lazy })
      i = j
      continue
    }

    if (ch === '{') {
      const m = /^\{(\d+)(,(\d+)?)?\}/.exec(pattern.slice(i))
      if (m) {
        let raw = m[0]
        let j = i + raw.length
        let lazy = false
        if (pattern[j] === '?') {
          lazy = true
          j++
          raw += '?'
        }
        const min = Number(m[1])
        const max = m[2] === undefined ? min : m[3] === undefined ? null : Number(m[3])
        tokens.push({ raw, kind: 'quantifier', quantMin: min, quantMax: max, lazy })
        i = j
        continue
      }
      tokens.push({ raw: '{', kind: 'literal' })
      i++
      continue
    }

    tokens.push({ raw: ch, kind: 'literal' })
    i++
  }

  return tokens
}

/** Ordered capture-group names (null = unnamed), 1-based position → index 0. */
function getPatternGroupNames(pattern: string): (string | null)[] {
  const names: (string | null)[] = []
  for (const t of tokenizePattern(pattern)) {
    if (t.kind === 'group-open' && (t.groupKind === 'capturing' || t.groupKind === 'named')) {
      names[t.groupNumber! - 1] = t.groupKind === 'named' ? (t.groupName ?? null) : null
    }
  }
  return names
}

/** Compile `pattern`/`flags` and run it against `testString`. Never throws. */
export function testRegex(pattern: string, flags: string, testString: string): RegexTestResult {
  if (pattern === '') return { matches: [], error: null }

  let re: RegExp
  try {
    re = new RegExp(pattern, flags)
  } catch (e) {
    return { matches: [], error: e instanceof Error ? e.message : 'Invalid regular expression.' }
  }

  const groupNames = getPatternGroupNames(pattern)
  const toRegexMatch = (m: RegExpExecArray): RegexMatch => {
    const groups: MatchGroup[] = []
    for (let i = 1; i < m.length; i++) {
      groups.push({ name: groupNames[i - 1] ?? i, value: m[i] })
    }
    return { match: m[0], index: m.index, groups }
  }

  if (!re.global) {
    const m = re.exec(testString)
    return { matches: m ? [toRegexMatch(m)] : [], error: null }
  }

  const matches: RegexMatch[] = []
  let iterations = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(testString)) !== null && iterations < MAX_MATCHES) {
    matches.push(toRegexMatch(m))
    iterations++
    // Zero-width matches (e.g. `x*`) don't advance `lastIndex` on their own —
    // force it forward so `exec` can't loop on the same position forever.
    if (m[0].length === 0) re.lastIndex++
  }
  return { matches, error: null }
}

const CONTROL_ESCAPES: Record<string, string> = {
  n: 'newline',
  t: 'tab',
  r: 'carriage return',
  '0': 'NUL character',
  v: 'vertical tab',
  f: 'form feed',
}

function describeAnchorStart(flags: string): string {
  return flags.includes('m')
    ? 'Matches the start of a line (multiline mode).'
    : 'Matches the start of the string.'
}

function describeAnchorEnd(flags: string): string {
  return flags.includes('m')
    ? 'Matches the end of a line (multiline mode).'
    : 'Matches the end of the string.'
}

function describeAny(flags: string): string {
  return flags.includes('s')
    ? 'Matches any character, including line breaks (dot-all mode).'
    : 'Matches any character except line breaks.'
}

function describeClass(raw: string): string {
  const negated = raw.startsWith('[^')
  const contents = raw.slice(negated ? 2 : 1, -1)
  return negated
    ? `Matches any character NOT in the set "${contents}".`
    : `Matches any one character in the set "${contents}".`
}

function describeQuantifier(t: Token): string {
  let base: string
  if (t.raw.startsWith('*')) base = 'Matches the previous token 0 or more times'
  else if (t.raw.startsWith('+')) base = 'Matches the previous token 1 or more times'
  else if (t.raw.startsWith('?')) base = 'Makes the previous token optional (0 or 1 times)'
  else if (t.quantMax === t.quantMin) {
    base = `Matches the previous token exactly ${t.quantMin} time${t.quantMin === 1 ? '' : 's'}`
  } else if (t.quantMax === null) {
    base = `Matches the previous token ${t.quantMin} or more times`
  } else {
    base = `Matches the previous token between ${t.quantMin} and ${t.quantMax} times`
  }
  return t.lazy ? `${base} (lazy — matches as few as possible).` : `${base}.`
}

function describeGroupOpen(t: Token): string {
  switch (t.groupKind) {
    case 'capturing':
      return `Starts capturing group #${t.groupNumber}.`
    case 'named':
      return `Starts a named capturing group "${t.groupName}".`
    case 'non-capturing':
      return 'Starts a non-capturing group (groups the content without creating a capture).'
    case 'lookahead':
      return 'Starts a positive lookahead — requires this to follow, without consuming it.'
    case 'neg-lookahead':
      return 'Starts a negative lookahead — requires this NOT to follow.'
    case 'lookbehind':
      return 'Starts a positive lookbehind — requires this to precede, without consuming it.'
    case 'neg-lookbehind':
      return 'Starts a negative lookbehind — requires this NOT to precede.'
    default:
      return 'Starts a group.'
  }
}

function describeBackreference(t: Token): string {
  return t.groupName
    ? `Matches the same text previously matched by the "${t.groupName}" group.`
    : `Matches the same text previously matched by capturing group #${t.groupNumber}.`
}

function describeLiteral(text: string): string {
  return text.length === 1
    ? `Matches the literal character "${text}".`
    : `Matches the literal text "${text}".`
}

/** Walk `pattern` (never the subject text) and describe it token by token. */
export function explainPattern(pattern: string, flags: string): ExplainRow[] {
  if (pattern === '') return []

  const rows: ExplainRow[] = []
  let literalToken = ''
  let literalText = ''

  function flushLiteral() {
    if (literalToken === '') return
    rows.push({ token: literalToken, description: describeLiteral(literalText) })
    literalToken = ''
    literalText = ''
  }

  for (const t of tokenizePattern(pattern)) {
    if (t.kind === 'literal') {
      const isEscaped = t.raw.length === 2 && t.raw[0] === '\\'
      const char = isEscaped ? t.raw[1]! : t.raw
      if (isEscaped && CONTROL_ESCAPES[char]) {
        flushLiteral()
        rows.push({ token: t.raw, description: `Matches a ${CONTROL_ESCAPES[char]} character.` })
        continue
      }
      literalToken += t.raw
      literalText += char
      continue
    }

    flushLiteral()
    switch (t.kind) {
      case 'anchor-start':
        rows.push({ token: t.raw, description: describeAnchorStart(flags) })
        break
      case 'anchor-end':
        rows.push({ token: t.raw, description: describeAnchorEnd(flags) })
        break
      case 'word-boundary':
        rows.push({
          token: t.raw,
          description:
            'Matches a word boundary (between a word character and a non-word character).',
        })
        break
      case 'non-word-boundary':
        rows.push({ token: t.raw, description: 'Matches a position that is NOT a word boundary.' })
        break
      case 'any':
        rows.push({ token: t.raw, description: describeAny(flags) })
        break
      case 'digit':
        rows.push({ token: t.raw, description: 'Matches any digit (0–9).' })
        break
      case 'non-digit':
        rows.push({ token: t.raw, description: 'Matches any character that is not a digit.' })
        break
      case 'word':
        rows.push({
          token: t.raw,
          description: 'Matches any word character (letter, digit, or underscore).',
        })
        break
      case 'non-word':
        rows.push({
          token: t.raw,
          description: 'Matches any character that is not a word character.',
        })
        break
      case 'space':
        rows.push({ token: t.raw, description: 'Matches any whitespace character.' })
        break
      case 'non-space':
        rows.push({ token: t.raw, description: 'Matches any character that is not whitespace.' })
        break
      case 'class':
        rows.push({ token: t.raw, description: describeClass(t.raw) })
        break
      case 'quantifier':
        rows.push({ token: t.raw, description: describeQuantifier(t) })
        break
      case 'group-open':
        rows.push({ token: t.raw, description: describeGroupOpen(t) })
        break
      case 'group-close':
        rows.push({ token: t.raw, description: 'Ends the group.' })
        break
      case 'alternation':
        rows.push({
          token: t.raw,
          description: 'Alternation — matches the pattern on the left or the right.',
        })
        break
      case 'backreference':
        rows.push({ token: t.raw, description: describeBackreference(t) })
        break
    }
  }
  flushLiteral()

  return rows
}

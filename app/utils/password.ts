/**
 * Password generation — pure, DOM-free logic (unit-tested in `test/`).
 * Uses cryptographically strong randomness (`crypto.getRandomValues`, available
 * in browsers and Node's webcrypto) with rejection sampling for an unbiased pick.
 */

export interface PasswordOptions {
  length: number
  lowercase: boolean
  uppercase: boolean
  digits: boolean
  symbols: boolean
  /** Drop visually confusable characters (I, l, 1, O, 0, …). */
  excludeAmbiguous: boolean
}

/** The four character classes a password can draw from. */
export const PASSWORD_SETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/',
} as const

const AMBIGUOUS = new Set('Il1O0o|`;:,.'.split(''))

/** Unbiased integer in `[0, maxExclusive)` from strong randomness. */
function randInt(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0
  const arr = new Uint32Array(1)
  const limit = Math.floor(0xffffffff / maxExclusive) * maxExclusive
  let x: number
  do {
    crypto.getRandomValues(arr)
    x = arr[0]!
  } while (x >= limit)
  return x % maxExclusive
}

/** The active character classes for `opts`, with ambiguous chars stripped. */
export function passwordSets(opts: PasswordOptions): string[] {
  const strip = (s: string) =>
    opts.excludeAmbiguous ? [...s].filter((c) => !AMBIGUOUS.has(c)).join('') : s
  const sets: string[] = []
  if (opts.lowercase) sets.push(strip(PASSWORD_SETS.lowercase))
  if (opts.uppercase) sets.push(strip(PASSWORD_SETS.uppercase))
  if (opts.digits) sets.push(strip(PASSWORD_SETS.digits))
  if (opts.symbols) sets.push(strip(PASSWORD_SETS.symbols))
  return sets.filter((s) => s.length > 0)
}

/** The full character pool (all active classes combined). */
export function passwordPool(opts: PasswordOptions): string {
  return passwordSets(opts).join('')
}

const pick = (chars: string) => chars.charAt(randInt(chars.length))

/**
 * Generate a single password. Guarantees at least one character from each
 * selected class (when the length allows) and shuffles the result. Returns an
 * empty string when no character class is selected.
 */
export function generatePassword(opts: PasswordOptions): string {
  const sets = passwordSets(opts)
  const pool = sets.join('')
  if (!pool) return ''
  const len = Math.max(1, Math.floor(opts.length))

  const chars: string[] = []
  for (const set of sets) {
    if (chars.length < len) chars.push(pick(set))
  }
  while (chars.length < len) chars.push(pick(pool))

  // Fisher–Yates shuffle so the guaranteed chars aren't always at the front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j]!, chars[i]!]
  }
  return chars.join('')
}

/** Shannon entropy in bits for a password of `length` from a pool of `poolSize`. */
export function passwordEntropyBits(length: number, poolSize: number): number {
  if (poolSize <= 1 || length <= 0) return 0
  return Math.round(length * Math.log2(poolSize))
}

export interface PasswordStrength {
  bits: number
  /** 0 = very weak … 4 = very strong. */
  score: 0 | 1 | 2 | 3 | 4
  label: string
}

/** Bucket an entropy value into a human strength label. */
export function passwordStrength(bits: number): PasswordStrength {
  let score: PasswordStrength['score']
  let label: string
  if (bits < 28) {
    score = 0
    label = 'Very weak'
  } else if (bits < 40) {
    score = 1
    label = 'Weak'
  } else if (bits < 60) {
    score = 2
    label = 'Fair'
  } else if (bits < 80) {
    score = 3
    label = 'Strong'
  } else {
    score = 4
    label = 'Very strong'
  }
  return { bits, score, label }
}

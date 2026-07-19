/**
 * Lorem ipsum generator — pure, DOM-free logic (unit-tested in `test/`).
 * Builds words, sentences, or paragraphs from the classic word bank. The RNG
 * is injectable so output is deterministic under test.
 */

const WORDS = [
  'lorem',
  'ipsum',
  'dolor',
  'sit',
  'amet',
  'consectetur',
  'adipiscing',
  'elit',
  'sed',
  'do',
  'eiusmod',
  'tempor',
  'incididunt',
  'ut',
  'labore',
  'et',
  'dolore',
  'magna',
  'aliqua',
  'enim',
  'ad',
  'minim',
  'veniam',
  'quis',
  'nostrud',
  'exercitation',
  'ullamco',
  'laboris',
  'nisi',
  'aliquip',
  'ex',
  'ea',
  'commodo',
  'consequat',
  'duis',
  'aute',
  'irure',
  'in',
  'reprehenderit',
  'voluptate',
  'velit',
  'esse',
  'cillum',
  'eu',
  'fugiat',
  'nulla',
  'pariatur',
  'excepteur',
  'sint',
  'occaecat',
  'cupidatat',
  'non',
  'proident',
  'sunt',
  'culpa',
  'qui',
  'officia',
  'deserunt',
  'mollit',
  'anim',
  'id',
  'est',
  'laborum',
  'perspiciatis',
  'unde',
  'omnis',
  'iste',
  'natus',
  'error',
  'accusantium',
  'doloremque',
  'laudantium',
  'totam',
  'rem',
  'aperiam',
  'eaque',
  'ipsa',
  'quae',
  'ab',
  'illo',
  'inventore',
  'veritatis',
  'quasi',
  'architecto',
  'beatae',
  'vitae',
  'dicta',
]

const LOREM_START = ['lorem', 'ipsum', 'dolor', 'sit', 'amet']

export type LoremUnit = 'paragraphs' | 'sentences' | 'words'

export interface LoremOptions {
  unit: LoremUnit
  count: number
  /** Begin with the canonical "Lorem ipsum dolor sit amet…". */
  startWithLorem?: boolean
  rng?: () => number
}

function makeRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function pick(rng: () => number): string {
  return WORDS[Math.floor(rng() * WORDS.length)]!
}

function capitalize(w: string): string {
  return w.charAt(0).toUpperCase() + w.slice(1)
}

/** Build a sentence of `n` words ending with a period. */
function buildSentence(n: number, rng: () => number): string {
  const words: string[] = []
  for (let i = 0; i < n; i++) words.push(pick(rng))
  let text = words.join(' ')
  // Sprinkle a comma into longer sentences.
  if (n > 6 && rng() > 0.5) {
    const idx = 2 + Math.floor(rng() * (n - 4))
    words[idx] = `${words[idx]},`
    text = words.join(' ')
  }
  return `${capitalize(text)}.`
}

/** Generate lorem ipsum text per the options. */
export function generateLorem(opts: LoremOptions): string {
  const rng = opts.rng ?? makeRng(1)
  const count = Math.max(0, Math.floor(opts.count))
  if (count === 0) return ''
  const start = opts.startWithLorem ?? true

  if (opts.unit === 'words') {
    const words: string[] = []
    for (let i = 0; i < count; i++) {
      words.push(start && i < LOREM_START.length ? LOREM_START[i]! : pick(rng))
    }
    return capitalize(words.join(' '))
  }

  const makeSentence = (first: boolean): string => {
    const n = 6 + Math.floor(rng() * 10)
    if (first && start) {
      const rest: string[] = []
      for (let i = LOREM_START.length; i < n; i++) rest.push(pick(rng))
      return `${capitalize([...LOREM_START, ...rest].join(' '))}.`
    }
    return buildSentence(n, rng)
  }

  if (opts.unit === 'sentences') {
    const out: string[] = []
    for (let i = 0; i < count; i++) out.push(makeSentence(i === 0))
    return out.join(' ')
  }

  // paragraphs
  const paras: string[] = []
  for (let p = 0; p < count; p++) {
    const sentences = 3 + Math.floor(rng() * 4)
    const out: string[] = []
    for (let s = 0; s < sentences; s++) out.push(makeSentence(p === 0 && s === 0))
    paras.push(out.join(' '))
  }
  return paras.join('\n\n')
}

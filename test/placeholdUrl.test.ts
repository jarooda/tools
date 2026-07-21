import { describe, it, expect } from 'vitest'
import {
  PLACEHOLD_DEFAULT_BG,
  PLACEHOLD_DEFAULT_FG,
  PLACEHOLD_MAX_DIM,
  PLACEHOLD_MAX_TEXT,
  buildPlaceholdPath,
  parsePlaceholdColor,
  parsePlaceholdRequest,
  parsePlaceholdSize,
} from '#shared/utils/placeholdUrl'

describe('parsePlaceholdSize', () => {
  it('parses WxH', () => {
    expect(parsePlaceholdSize('600x400')).toEqual({ width: 600, height: 400 })
  })

  it('accepts an uppercase separator', () => {
    expect(parsePlaceholdSize('600X400')).toEqual({ width: 600, height: 400 })
  })

  it('treats a single number as square', () => {
    expect(parsePlaceholdSize('300')).toEqual({ width: 300, height: 300 })
  })

  it('clamps oversized dimensions instead of failing', () => {
    expect(parsePlaceholdSize('99999x10')).toEqual({ width: PLACEHOLD_MAX_DIM, height: 10 })
  })

  it('rejects non-numeric, zero, and malformed input', () => {
    for (const bad of ['abc', '', '0', '0x0', '600x', 'x400', '-5', '6.5x4', '600x400x200']) {
      expect(parsePlaceholdSize(bad)).toBeNull()
    }
  })
})

describe('parsePlaceholdColor', () => {
  it('expands 3- and 4-digit hex', () => {
    expect(parsePlaceholdColor('fff')).toBe('#ffffff')
    expect(parsePlaceholdColor('f00f')).toBe('#ff0000ff')
  })

  it('passes through 6- and 8-digit hex, normalising case', () => {
    expect(parsePlaceholdColor('E2E8F0')).toBe('#e2e8f0')
    expect(parsePlaceholdColor('e2e8f080')).toBe('#e2e8f080')
  })

  it('tolerates a leading #', () => {
    expect(parsePlaceholdColor('#abc')).toBe('#aabbcc')
  })

  it('resolves named basics and aliases', () => {
    expect(parsePlaceholdColor('orange')).toBe('#ffa500')
    expect(parsePlaceholdColor('WHITE')).toBe('#ffffff')
    expect(parsePlaceholdColor('grey')).toBe(parsePlaceholdColor('gray'))
    expect(parsePlaceholdColor('cyan')).toBe(parsePlaceholdColor('aqua'))
  })

  it('rejects unknown names and bad hex lengths', () => {
    for (const bad of ['', 'notacolour', 'ff', 'fffff', 'zzz', 'rgb(1,2,3)']) {
      expect(parsePlaceholdColor(bad)).toBeNull()
    }
  })
})

describe('parsePlaceholdRequest', () => {
  it('defaults colours, text, and font when only a size is given', () => {
    expect(parsePlaceholdRequest(['600x400'])).toEqual({
      width: 600,
      height: 400,
      bg: PLACEHOLD_DEFAULT_BG,
      fg: PLACEHOLD_DEFAULT_FG,
      text: '',
      font: 'sans',
    })
  })

  it('reads background and foreground segments', () => {
    const p = parsePlaceholdRequest(['600x400', '000', 'orange'])
    expect(p).toMatchObject({ bg: '#000000', fg: '#ffa500' })
  })

  it('falls back to defaults for unparseable colours rather than failing', () => {
    const p = parsePlaceholdRequest(['600x400', 'bogus', 'alsobogus'])
    expect(p).toMatchObject({ bg: PLACEHOLD_DEFAULT_BG, fg: PLACEHOLD_DEFAULT_FG })
  })

  it('accepts `label` as an alias of `text`, preferring `text`', () => {
    expect(parsePlaceholdRequest(['300'], { label: 'From label' })?.text).toBe('From label')
    expect(parsePlaceholdRequest(['300'], { text: 'A', label: 'B' })?.text).toBe('A')
  })

  it('takes the first value when a query param repeats', () => {
    expect(parsePlaceholdRequest(['300'], { text: ['one', 'two'] })?.text).toBe('one')
  })

  it('truncates overlong text', () => {
    const p = parsePlaceholdRequest(['300'], { text: 'x'.repeat(500) })
    expect(p?.text).toHaveLength(PLACEHOLD_MAX_TEXT)
  })

  it('only honours safelisted fonts', () => {
    expect(parsePlaceholdRequest(['300'], { font: 'serif' })?.font).toBe('serif')
    expect(parsePlaceholdRequest(['300'], { font: 'mono' })?.font).toBe('mono')
    expect(parsePlaceholdRequest(['300'], { font: 'Comic Sans' })?.font).toBe('sans')
  })

  it('returns null without a usable size', () => {
    expect(parsePlaceholdRequest([])).toBeNull()
    expect(parsePlaceholdRequest(['nope'])).toBeNull()
  })
})

describe('buildPlaceholdPath', () => {
  const base = {
    width: 600,
    height: 400,
    bg: PLACEHOLD_DEFAULT_BG,
    fg: PLACEHOLD_DEFAULT_FG,
    text: '',
    font: 'sans',
  } as const

  it('omits every default', () => {
    expect(buildPlaceholdPath({ ...base })).toBe('/placehold/600x400')
  })

  it('collapses equal dimensions to one segment', () => {
    expect(buildPlaceholdPath({ ...base, width: 300, height: 300 })).toBe('/placehold/300')
  })

  it('emits the background segment when it differs', () => {
    expect(buildPlaceholdPath({ ...base, bg: '#000000' })).toBe('/placehold/600x400/000000')
  })

  it('keeps the background as a positional placeholder when only fg differs', () => {
    expect(buildPlaceholdPath({ ...base, fg: '#ffffff' })).toBe('/placehold/600x400/e2e8f0/ffffff')
  })

  it('encodes text and non-default font', () => {
    expect(buildPlaceholdPath({ ...base, text: 'Hello World', font: 'serif' })).toBe(
      '/placehold/600x400?text=Hello+World&font=serif',
    )
  })

  it('round-trips through the parser', () => {
    const params = {
      width: 1200,
      height: 630,
      bg: '#0b3a2c',
      fg: '#ffffff',
      text: 'Open Graph',
      font: 'mono',
    } as const
    const path = buildPlaceholdPath({ ...params })
    const url = new URL(path, 'https://example.com')
    const segments = url.pathname.split('/').filter(Boolean).slice(1)
    const query = Object.fromEntries(url.searchParams)
    expect(parsePlaceholdRequest(segments, query)).toEqual(params)
  })
})

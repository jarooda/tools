import { describe, it, expect } from 'vitest'
import { placeholderSvg, placeholderLabel, placeholderFontSize } from '#shared/utils/placeholderSvg'

describe('placeholderLabel', () => {
  it('falls back to dimensions when text is blank', () => {
    expect(placeholderLabel(800, 600)).toBe('800×600')
    expect(placeholderLabel(800, 600, '  ')).toBe('800×600')
    expect(placeholderLabel(800, 600, 'Hero')).toBe('Hero')
  })
})

describe('placeholderFontSize', () => {
  it('scales with the smaller side and clamps', () => {
    expect(placeholderFontSize(800, 400)).toBe(50)
    expect(placeholderFontSize(20, 20)).toBe(12)
    expect(placeholderFontSize(4000, 4000)).toBe(160)
  })
})

describe('placeholderSvg', () => {
  it('embeds dimensions and colours', () => {
    const svg = placeholderSvg({ width: 320, height: 200, bg: '#eee', fg: '#333' })
    expect(svg).toContain('width="320"')
    expect(svg).toContain('height="200"')
    expect(svg).toContain('fill="#eee"')
    expect(svg).toContain('fill="#333"')
    expect(svg).toContain('320×200')
    expect(svg.startsWith('<svg')).toBe(true)
  })

  it('escapes label text', () => {
    const svg = placeholderSvg({ width: 100, height: 100, bg: '#000', fg: '#fff', text: 'a & <b>' })
    expect(svg).toContain('a &amp; &lt;b&gt;')
    expect(svg).not.toContain('<b>')
  })

  it('rounds and floors invalid sizes to at least 1', () => {
    const svg = placeholderSvg({ width: 0, height: -5, bg: '#000', fg: '#fff' })
    expect(svg).toContain('width="1"')
    expect(svg).toContain('height="1"')
  })
})

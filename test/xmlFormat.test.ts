import { describe, it, expect } from 'vitest'
import { formatXml } from '@/utils/xmlFormat'

describe('formatXml', () => {
  it('indents nested elements', () => {
    const out = formatXml('<a><b>text</b></a>')
    expect(out).toBe('<a>\n  <b>text</b>\n</a>')
  })

  it('handles multiple children', () => {
    const out = formatXml('<root><a>1</a><b>2</b></root>')
    expect(out).toBe('<root>\n  <a>1</a>\n  <b>2</b>\n</root>')
  })

  it('keeps self-closing tags at their level', () => {
    const out = formatXml('<root><img/><br/></root>')
    expect(out).toBe('<root>\n  <img/>\n  <br/>\n</root>')
  })

  it('supports tab indentation', () => {
    expect(formatXml('<a><b/></a>', 'tab')).toBe('<a>\n\t<b/>\n</a>')
  })

  it('preserves an XML declaration', () => {
    const out = formatXml('<?xml version="1.0"?><a><b/></a>')
    expect(out).toBe('<?xml version="1.0"?>\n<a>\n  <b/>\n</a>')
  })

  it('returns empty for empty input', () => {
    expect(formatXml('   ')).toBe('')
  })
})

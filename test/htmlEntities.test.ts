import { describe, it, expect } from 'vitest'
import { encodeHtml, decodeHtml } from '@/utils/htmlEntities'

describe('encodeHtml', () => {
  it('escapes the five markup characters', () => {
    expect(encodeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    )
  })

  it('escapes ampersand first (no double-escaping issues)', () => {
    expect(encodeHtml('a & b < c')).toBe('a &amp; b &lt; c')
  })
})

describe('decodeHtml', () => {
  it('decodes named entities', () => {
    expect(decodeHtml('&lt;p&gt;Tom &amp; Jerry&lt;/p&gt;')).toBe('<p>Tom & Jerry</p>')
    expect(decodeHtml('caf&eacute;')).toBe('caf&eacute;') // unknown name left as-is
    expect(decodeHtml('5 &copy; 2020')).toBe('5 © 2020')
  })

  it('decodes decimal and hex references', () => {
    expect(decodeHtml('&#65;&#66;&#67;')).toBe('ABC')
    expect(decodeHtml('&#x1F600;')).toBe('😀')
  })

  it('leaves unknown or malformed entities untouched', () => {
    expect(decodeHtml('&unknown;')).toBe('&unknown;')
    expect(decodeHtml('bare & text')).toBe('bare & text')
  })

  it('round-trips with encodeHtml', () => {
    const s = `<div class="a">1 & 2 > 0</div>`
    expect(decodeHtml(encodeHtml(s))).toBe(s)
  })
})

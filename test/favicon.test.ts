import { describe, it, expect } from 'vitest'
import { FAVICON_SIZES, ICO_SIZES, buildIco, faviconHtmlSnippet } from '@/utils/favicon'

describe('favicon sizes', () => {
  it('includes the common favicon + touch icon sizes', () => {
    const sizes = FAVICON_SIZES.map((s) => s.size)
    expect(sizes).toContain(16)
    expect(sizes).toContain(32)
    expect(sizes).toContain(180)
    expect(sizes).toContain(512)
  })

  it('bundles 16/32/48 into the ico', () => {
    expect(ICO_SIZES).toEqual([16, 32, 48])
  })
})

describe('buildIco', () => {
  it('writes a valid ICO header and directory', async () => {
    const entries = [
      { size: 16, png: new Uint8Array([1, 2, 3]) },
      { size: 32, png: new Uint8Array([4, 5, 6, 7]) },
    ]
    const blob = buildIco(entries)
    const buf = new DataView(await blob.arrayBuffer())

    expect(buf.getUint16(0, true)).toBe(0) // reserved
    expect(buf.getUint16(2, true)).toBe(1) // type = icon
    expect(buf.getUint16(4, true)).toBe(2) // entry count

    // First entry: 16px, offset just past header(6) + 2 dir entries(32) = 38.
    expect(buf.getUint8(6)).toBe(16)
    expect(buf.getUint32(6 + 8, true)).toBe(3) // bytes in resource
    expect(buf.getUint32(6 + 12, true)).toBe(38) // image offset
  })

  it('encodes size 256 as 0 in the directory', async () => {
    const blob = buildIco([{ size: 256, png: new Uint8Array([0]) }])
    const buf = new DataView(await blob.arrayBuffer())
    expect(buf.getUint8(6)).toBe(0)
  })
})

describe('faviconHtmlSnippet', () => {
  it('references the ico and png assets', () => {
    const html = faviconHtmlSnippet()
    expect(html).toContain('favicon.ico')
    expect(html).toContain('apple-touch-icon')
  })
})

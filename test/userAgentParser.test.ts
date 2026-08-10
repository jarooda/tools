import { describe, it, expect } from 'vitest'
import { parseUserAgent } from '@/utils/userAgentParser'

describe('parseUserAgent', () => {
  it('parses Chrome on Windows', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    const r = parseUserAgent(ua)
    expect(r.browser).toEqual({ name: 'Chrome', version: '119.0.0.0' })
    expect(r.os).toEqual({ name: 'Windows', version: '10' })
    expect(r.device.type).toBe('desktop')
    expect(r.engine.name).toBe('Blink')
  })

  it('parses Safari on iOS', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    const r = parseUserAgent(ua)
    expect(r.browser.name).toBe('Mobile Safari')
    expect(r.os).toEqual({ name: 'iOS', version: '17.0' })
    expect(r.device).toEqual({ type: 'mobile', vendor: 'Apple', model: 'iPhone' })
    expect(r.engine.name).toBe('WebKit')
  })

  it('parses Firefox on macOS', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0'
    const r = parseUserAgent(ua)
    expect(r.browser).toEqual({ name: 'Firefox', version: '120.0' })
    expect(r.os).toEqual({ name: 'Mac OS', version: '10.15' })
    expect(r.device.type).toBe('desktop')
    expect(r.engine.name).toBe('Gecko')
  })

  it('parses Android Chrome mobile', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36'
    const r = parseUserAgent(ua)
    expect(r.browser).toEqual({ name: 'Chrome', version: '119.0.0.0' })
    expect(r.os).toEqual({ name: 'Android', version: '13' })
    expect(r.device).toEqual({ type: 'mobile', vendor: 'Google', model: 'Pixel 7' })
  })

  it('flags a known bot UA as device.type bot', () => {
    const ua = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    const r = parseUserAgent(ua)
    expect(r.device.type).toBe('bot')
    expect(r.browser).toEqual({ name: null, version: null })
  })

  it('returns all-null fields for an empty string', () => {
    const r = parseUserAgent('')
    expect(r).toEqual({
      browser: { name: null, version: null },
      os: { name: null, version: null },
      device: { type: null, vendor: null, model: null },
      engine: { name: null, version: null },
    })
  })

  it('returns all-null fields for garbage input without throwing', () => {
    expect(() => parseUserAgent('garbage not a ua string 12345')).not.toThrow()
    const r = parseUserAgent('garbage not a ua string 12345')
    expect(r).toEqual({
      browser: { name: null, version: null },
      os: { name: null, version: null },
      device: { type: null, vendor: null, model: null },
      engine: { name: null, version: null },
    })
  })
})

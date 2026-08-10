import { describe, it, expect } from 'vitest'
import { stripToHostname, ensureScheme } from '../app/utils/normalizeHostInput'

describe('stripToHostname', () => {
  it('passes through a bare hostname unchanged', () => {
    expect(stripToHostname('example.com')).toBe('example.com')
  })

  it('strips https:// scheme and path', () => {
    expect(stripToHostname('https://example.com/some/path')).toBe('example.com')
  })

  it('strips http:// scheme, query, and fragment', () => {
    expect(stripToHostname('http://example.com/page?query=1#section')).toBe('example.com')
  })

  it('strips a port', () => {
    expect(stripToHostname('example.com:8080')).toBe('example.com')
  })

  it('strips a trailing dot', () => {
    expect(stripToHostname('example.com.')).toBe('example.com')
  })

  it('lowercases the result', () => {
    expect(stripToHostname('EXAMPLE.COM')).toBe('example.com')
  })

  it('handles a full URL with scheme, port, path, and trailing dot combined', () => {
    expect(stripToHostname('https://Example.com:8443/foo/bar?x=1#y')).toBe('example.com')
  })

  it('passes through an IPv4 literal sensibly', () => {
    expect(stripToHostname('192.168.1.1')).toBe('192.168.1.1')
  })

  it('passes through a bracketed IPv6 literal sensibly', () => {
    expect(stripToHostname('[2001:db8::1]')).toBe('2001:db8::1')
  })

  it('strips scheme and port from a bracketed IPv6 URL', () => {
    expect(stripToHostname('https://[2001:db8::1]:8080/path')).toBe('2001:db8::1')
  })

  it('passes through an unbracketed IPv6 literal sensibly', () => {
    expect(stripToHostname('2001:db8::1')).toBe('2001:db8::1')
  })

  it('degrades gracefully on empty/partial input without throwing', () => {
    expect(() => stripToHostname('')).not.toThrow()
    expect(stripToHostname('')).toBe('')
    expect(() => stripToHostname('https://')).not.toThrow()
    expect(() => stripToHostname('   ')).not.toThrow()
  })
})

describe('ensureScheme', () => {
  it('prepends https:// to a schemeless input', () => {
    expect(ensureScheme('example.com')).toBe('https://example.com')
  })

  it('leaves an already-schemed https:// URL untouched', () => {
    expect(ensureScheme('https://example.com')).toBe('https://example.com')
  })

  it('leaves an already-schemed http:// URL untouched (does not upgrade to https)', () => {
    expect(ensureScheme('http://example.com')).toBe('http://example.com')
  })

  it('degrades gracefully on empty input without throwing', () => {
    expect(() => ensureScheme('')).not.toThrow()
    expect(ensureScheme('')).toBe('')
  })
})

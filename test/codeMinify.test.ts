import { describe, it, expect } from 'vitest'
import { minifyCode } from '@/utils/codeMinify'

describe('minifyCode', () => {
  it('minifies JavaScript', async () => {
    const r = await minifyCode('function add(a, b) {\n  return a + b;\n}', 'javascript')
    expect(r.error).toBeNull()
    expect(r.output.length).toBeLessThan(40)
    expect(r.stats).not.toBeNull()
    expect(r.stats!.outputBytes).toBeLessThan(r.stats!.inputBytes)
  })

  it('minifies CSS', async () => {
    const r = await minifyCode('a {\n  color: red;\n}\n', 'css')
    expect(r.error).toBeNull()
    expect(r.output).toBe('a{color:red}')
  })

  it('minifies HTML', async () => {
    const r = await minifyCode('<div>\n  <p>hi</p>\n</div>\n', 'html')
    expect(r.error).toBeNull()
    expect(r.output).not.toContain('\n  ')
  })

  it('reports a line/column error for invalid JS', async () => {
    const r = await minifyCode('const x = {', 'javascript')
    expect(r.output).toBe('')
    expect(r.error).not.toBeNull()
    expect(r.stats).toBeNull()
  })

  it('is empty for empty input', async () => {
    expect(await minifyCode('', 'javascript')).toEqual({ output: '', error: null, stats: null })
  })

  it('reports stats even when the reduction is near zero', async () => {
    const r = await minifyCode('a{color:red}', 'css')
    expect(r.error).toBeNull()
    expect(r.stats).toEqual({ inputBytes: 12, outputBytes: 12 })
  })
})

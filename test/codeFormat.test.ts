import { describe, it, expect } from 'vitest'
import { formatCode } from '@/utils/codeFormat'

describe('formatCode', () => {
  it('formats JSON', async () => {
    const r = await formatCode('{"a":1,"b":2}', 'json')
    expect(r.error).toBeNull()
    expect(r.output.trim()).toBe('{ "a": 1, "b": 2 }')
  })

  it('formats JavaScript', async () => {
    const r = await formatCode('const x=1', 'javascript')
    expect(r.error).toBeNull()
    expect(r.output.trim()).toBe('const x = 1;')
  })

  it('formats CSS', async () => {
    const r = await formatCode('a{color:red}', 'css')
    expect(r.error).toBeNull()
    expect(r.output.trim()).toBe('a {\n  color: red;\n}')
  })

  it('formats HTML', async () => {
    const r = await formatCode('<div><p>hi</p></div>', 'html')
    expect(r.error).toBeNull()
    expect(r.output).toContain('<div>')
  })

  it('formats SQL', async () => {
    const r = await formatCode('select * from users', 'sql')
    expect(r.error).toBeNull()
    expect(r.output).toContain('select')
  })

  it('supports tab indentation', async () => {
    const r = await formatCode('{"a":1}', 'json', 'tab')
    expect(r.output.trim()).toBe('{ "a": 1 }')
  })

  it('reports a line/column error for invalid JS', async () => {
    const r = await formatCode('const x = {', 'javascript')
    expect(r.output).toBe('')
    expect(r.error).not.toBeNull()
    expect(r.error?.line).toBe(1)
    expect(r.error?.column).toBeGreaterThan(0)
  })

  it('is empty for empty input', async () => {
    expect(await formatCode('', 'javascript')).toEqual({ output: '', error: null })
  })
})

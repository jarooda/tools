import { describe, it, expect } from 'vitest'
import { tools, toolRoute, getTool } from '@/lib/tools/registry'
import { categories, getCategory } from '@/lib/tools/categories'

describe('tool registry', () => {
  it('has unique tool ids', () => {
    const ids = tools.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every tool belongs to a known category', () => {
    for (const t of tools) {
      expect(getCategory(t.category)).toBeDefined()
    }
  })

  it('builds a route from category and slug', () => {
    const temp = getTool('temperature')!
    expect(temp).toBeDefined()
    expect(toolRoute(temp)).toBe('/convert/temperature')
  })

  it('exposes 12 categories', () => {
    expect(categories).toHaveLength(12)
  })
})

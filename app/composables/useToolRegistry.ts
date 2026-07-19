import { categories, getCategory, type Category, type CategorySlug } from '@/lib/tools/categories'
import { tools, toolRoute, toolsInCategory, type Tool } from '@/lib/tools/registry'

/**
 * Read access to the tool registry for pages, sidebar, and ⌘K search.
 * Pure data — safe on server and client.
 */
export function useToolRegistry() {
  function search(query: string): Tool[] {
    const q = query.trim().toLowerCase()
    if (!q) return tools
    return tools.filter((t) => {
      const haystack = [t.title, t.description, t.category, ...t.keywords].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }

  /** Categories paired with their tools, for grouped navigation/grids. */
  function categoriesWithTools(): Array<Category & { tools: Tool[] }> {
    return categories.map((c) => ({ ...c, tools: toolsInCategory(c.slug) }))
  }

  return {
    tools,
    categories,
    getCategory,
    toolRoute,
    toolsInCategory,
    categoriesWithTools,
    search,
  }
}

export type { Tool, Category, CategorySlug }

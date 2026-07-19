import { APP_NAME, SITE_URL } from '@/lib/config'
import { toolRoute, type Tool } from '@/lib/tools/registry'

/**
 * Set per-page SEO metadata (title, description, canonical, Open Graph)
 * from a registry tool entry. Call once in a tool page's `setup`.
 */
export function useToolSeo(tool: Tool) {
  const title = `${tool.title} — ${APP_NAME}`
  const url = `${SITE_URL}${toolRoute(tool)}`

  useSeoMeta({
    title,
    description: tool.description,
    ogTitle: title,
    ogDescription: tool.description,
    ogUrl: url,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: tool.description,
  })

  useHead({
    link: [{ rel: 'canonical', href: url }],
  })
}

/**
 * Placeholder image service — `/placehold/{size}[/{bg}[/{fg}]]?text=…&font=…`
 *
 * Serves a generated SVG so the URL can be dropped straight into an `<img src>`
 * (the placehold.co pattern). It is **stateless**: the response is a pure
 * function of the URL, so there's nothing to store and it can be cached
 * forever. The same generator backs the client-side Placeholder tool.
 *
 * Catch-all because the colour segments are optional.
 */
import { placeholderSvg } from '#shared/utils/placeholderSvg'
import { PLACEHOLD_FONTS, parsePlaceholdRequest } from '#shared/utils/placeholdUrl'

export default defineEventHandler((event) => {
  const path = getRouterParam(event, 'path') ?? ''
  const segments = path.split('/').filter(Boolean)

  const params = parsePlaceholdRequest(segments, getQuery(event))
  if (!params) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Expected /placehold/{width}x{height}, e.g. /placehold/600x400',
    })
  }

  const svg = placeholderSvg({
    width: params.width,
    height: params.height,
    bg: params.bg,
    fg: params.fg,
    text: params.text,
    fontFamily: PLACEHOLD_FONTS[params.font],
  })

  setResponseHeaders(event, {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    // Same URL always renders the same bytes — safe to cache indefinitely.
    'Cache-Control': 'public, max-age=31536000, immutable',
    // Defence in depth: an SVG is an active document when navigated to directly.
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    'X-Content-Type-Options': 'nosniff',
  })

  return svg
})

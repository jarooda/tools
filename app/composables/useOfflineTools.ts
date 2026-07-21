import { computed, onMounted, ref, watch } from 'vue'
import type { Tool, ToolRequirement } from '@/lib/tools/registry'

/**
 * Offline availability for the tool grid.
 *
 * Most tools are pure client-side and keep working with no connection once the
 * service worker has precached the shell. The exceptions are declared per tool
 * via `requires` in the registry, and fall into two groups:
 *
 *   • `network` — always unavailable offline, nothing to check.
 *   • fetch-on-demand assets (`ffmpeg-core`, `ml-model`) — unavailable *only*
 *     until the asset has been downloaded once. After that the SW serves it
 *     from cache and the tool genuinely works offline, so we probe Cache
 *     Storage rather than blanket-disabling them.
 */

type CacheableRequirement = Exclude<ToolRequirement, 'network'>

/**
 * Matched against every URL in Cache Storage. Patterns rather than exact paths
 * because Vite content-hashes these filenames at build time.
 */
const ASSET_PATTERN: Record<CacheableRequirement, RegExp> = {
  'ffmpeg-core': /ffmpeg-core[\w.-]*\.wasm(\?|$)/,
  'ml-model': /\.onnx(\?|$)/,
}

const cachedRequirements = ref<Set<CacheableRequirement>>(new Set())
/** Until the first probe resolves we assume the best, so cards never flash disabled. */
const probed = ref(false)

async function probeCaches(): Promise<void> {
  if (!import.meta.client || !('caches' in globalThis)) {
    probed.value = true
    return
  }
  const found = new Set<CacheableRequirement>()
  try {
    for (const name of await caches.keys()) {
      const cache = await caches.open(name)
      for (const request of await cache.keys()) {
        for (const [requirement, pattern] of Object.entries(ASSET_PATTERN)) {
          if (pattern.test(request.url)) found.add(requirement as CacheableRequirement)
        }
      }
    }
  } catch {
    // Cache Storage is unavailable in some private-browsing modes — degrade to
    // "nothing is cached" rather than breaking the grid.
  }
  cachedRequirements.value = found
  probed.value = true
}

const HINT: Record<ToolRequirement, string> = {
  network: 'This tool needs a live connection to fetch data.',
  'ffmpeg-core':
    'Open this tool once while online to download the converter, then it works offline.',
  'ml-model': 'Open this tool once while online to download the model, then it works offline.',
}

export function useOfflineTools() {
  const online = useOnline()

  // The server can't know the client's connectivity, so the first client render
  // must match the SSR'd HTML (everything enabled) and only then reconcile.
  const mounted = ref(false)
  onMounted(() => {
    mounted.value = true
    void probeCaches()
  })

  const offline = computed(() => mounted.value && !online.value)

  // Dropping offline is exactly when a stale probe would mislead — an asset may
  // have been cached since the last check.
  watch(offline, (isOffline) => {
    if (isOffline) void probeCaches()
  })

  /** True when `tool` cannot run right now because the device is offline. */
  function isUnavailableOffline(tool: Tool): boolean {
    if (!offline.value || !tool.requires) return false
    if (tool.requires === 'network') return true
    // Optimistic until the probe lands, so the grid doesn't flicker.
    if (!probed.value) return false
    return !cachedRequirements.value.has(tool.requires)
  }

  /** Explanatory tooltip for a tool disabled by `isUnavailableOffline`. */
  function offlineHint(tool: Tool): string | undefined {
    return tool.requires ? HINT[tool.requires] : undefined
  }

  return { online, offline, isUnavailableOffline, offlineHint }
}

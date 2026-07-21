import * as iconRegistry from './app/lib/icons'

/**
 * Every `mdi:*` name declared in app/lib/icons.ts, flattened out of whichever
 * map holds it. Derived rather than hand-listed so adding an icon to the
 * registry is all it takes — see `icon.clientBundle` below for why they must be
 * bundled into the client build.
 */
const BUNDLED_ICONS = [
  ...new Set(
    Object.values(iconRegistry)
      .flatMap((group) => (group && typeof group === 'object' ? Object.values(group) : []))
      .filter((name) => typeof name === 'string' && name.startsWith('mdi:')),
  ),
]

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  components: [{ path: '~/components', ignore: ['**/ui/**'] }],
  modules: ['@nuxt/eslint', '@nuxt/icon', '@vueuse/nuxt', '@nuxtjs/sitemap', '@vite-pwa/nuxt'],
  css: ['@/assets/css/main.css'],
  // Icons: Material Design Icons bundled locally (no runtime calls to the
  // Iconify API) — keeps the toolkit privacy-first and offline-capable.
  icon: {
    mode: 'svg',
    serverBundle: { collections: ['mdi'] },
    // `serverBundle` alone only covers icons present in the server-rendered
    // HTML. Any icon that first appears client-side (anything behind a `v-if`,
    // a toggle, or a client-side route change) misses it and falls back to
    // fetching https://api.iconify.design at runtime — which breaks the offline
    // badge precisely when it is needed, and leaks a third-party request that
    // the comment above promises we don't make. Bundling them into the client
    // build keeps the data in precached JS, so they render with no network.
    //
    // `scan` alone is not enough: it only finds literal `<Icon name="mdi:x" />`
    // usages, and every icon here is referenced indirectly (`UI_ICON.offline`),
    // so the explicit list from the registry is what actually does the work.
    clientBundle: { scan: true, icons: BUNDLED_ICONS },
  },
  site: {
    url: 'https://tools.jaluwibowo.id',
    name: 'Toolkit',
  },
  // Installable + offline. The tools already run entirely client-side, so once
  // the shell is cached the whole toolkit genuinely works with no network.
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Toolkit — Privacy-first browser tools',
      short_name: 'Toolkit',
      description:
        'A fast, privacy-first collection of tools for converting, editing, encoding, and generating — all processed locally in your browser. No uploads, no tracking.',
      lang: 'en',
      start_url: '/',
      display: 'standalone',
      // Both match the light app chrome; the theme-color metas in app.head
      // handle the dark case, which a static manifest can't express.
      theme_color: '#f3f5f3',
      background_color: '#f3f5f3',
      categories: ['utilities', 'productivity'],
      // `any maskable` on the same files rather than a separate maskable icon:
      // the artwork is exported with its content inside the 80% safe zone
      // (measured max radius ~81%), so Android's circular crop has nothing to
      // cut off and one file covers both purposes.
      icons: [
        {
          src: '/android-chrome-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    },
    workbox: {
      // Precache the app shell only. `wasm` is deliberately absent: the bundled
      // single-threaded ffmpeg core alone is ~31 MB, and precaching it would
      // make every first visit pay that download before the SW activates.
      // The runtime rule below caches it on first actual use instead.
      globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2}'],
      // Offline navigations fall back to the prerendered shell (see
      // nitro.prerender below); Nuxt's router then renders the right page
      // client-side from the precached chunks. This MUST point at a route that
      // is actually a static file in the build — an SSR-only route isn't in the
      // precache manifest, so workbox has nothing to serve and offline reloads
      // fail with a blank page.
      navigateFallback: '/offline-shell',
      // Server routes are not navigations to be shadowed by the shell.
      navigateFallbackDenylist: [/^\/api\//, /^\/placehold\//],
      runtimeCaching: [
        {
          // ffmpeg / pdfjs / background-removal cores. CacheFirst because these
          // are content-hashed by Vite — a new build yields a new URL, so a
          // cached entry can never go stale.
          urlPattern: ({ url }) => url.pathname.endsWith('.wasm'),
          handler: 'CacheFirst',
          options: {
            cacheName: 'toolkit-wasm',
            expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
      // Same reasoning as globPatterns — keep the big cores out of precache.
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
    },
    // A SW in dev shadows HMR and would fight the ffmpeg worker workaround
    // documented below. Test the PWA with `pnpm build && pnpm preview`.
    devOptions: { enabled: false },
  },
  nitro: {
    // Emit `/` as a real index.html so the service worker can precache it and
    // serve the homepage with no connection. Without this the homepage is
    // rendered per-request and never exists as a file, which leaves the PWA
    // unable to boot offline. The homepage is a static tool listing, so
    // prerendering costs nothing; every other route still renders on demand.
    prerender: { routes: ['/'], crawlLinks: false },
  },
  routeRules: {
    // A payload-free SPA shell, prerendered purely to back the service worker's
    // offline navigation fallback. Reusing the prerendered `/` for that doesn't
    // work: its embedded payload pins the router to `/`, so reloading a tool
    // page offline silently bounces the user to the homepage. This shell has no
    // route baked in, so Nuxt boots and renders whatever the URL asks for.
    // Kept out of the sitemap; public/robots.txt disallows it too.
    '/offline-shell': { ssr: false, prerender: true, sitemap: false },
  },
  // NOTE: the /media/* tools deliberately do NOT set COOP/COEP. We ship the
  // single-threaded `@ffmpeg/core`, which needs no SharedArrayBuffer, and
  // cross-origin isolation actively breaks it: under COEP `require-corp` the
  // browser blocks ffmpeg's own module worker (`ERR_BLOCKED_BY_RESPONSE`)
  // because the bundled worker chunk under /_nuxt/ carries no COEP header.
  // Only reintroduce these headers alongside `@ffmpeg/core-mt`, and then they
  // must also cover /_nuxt/**.
  vite: {
    optimizeDeps: {
      // ffmpeg.wasm spawns its worker with
      // `new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })`.
      // Vite's dep optimizer rewrites that URL to a path inside
      // node_modules/.cache/vite that it never emits, so in **dev** the worker
      // 404s ("The file does not exist at .../worker.js?worker_file&type=module"),
      // `load()` never settles, and the media tools hang forever on
      // "Loading the converter". Excluding them from pre-bundling keeps the
      // worker URL intact. Production builds are unaffected — this is dev-only.
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
  },
  app: {
    head: {
      // Screen readers and translation tools need an explicit document language.
      htmlAttrs: { lang: 'en' },
      // Native controls/scrollbars follow the active theme (no white flash in dark).
      meta: [
        { name: 'color-scheme', content: 'light dark' },
        // Tint the browser/OS chrome to match the app header, per theme. The
        // manifest's static theme_color can't do this, so it covers light and
        // these override per `prefers-color-scheme`.
        { name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#f3f5f3' },
        { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#0a0d0c' },
      ],
      link: [
        // iOS ignores the manifest's icons for "Add to Home Screen".
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
        // Crisper than scaling favicon.ico's 16/32/48 bitmaps in-browser.
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        // @vite-pwa/nuxt injects this via vite-plugin-pwa's index.html
        // transform, which Nuxt's SSR renderer never runs — without an explicit
        // link the app serves a manifest nothing points at, and won't install.
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
      // Synchronous, pre-paint theme resolution to avoid a light→dark flash on
      // refresh: honour the stored choice, else fall back to the OS preference.
      // Must stay in <head> and un-deferred so it runs before first paint.
      script: [
        {
          tagPosition: 'head',
          innerHTML:
            "try{var t=localStorage.getItem('toolkit-theme');" +
            "if(t!=='dark'&&t!=='light')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';" +
            "document.documentElement.setAttribute('data-theme',t)}catch(e){}",
        },
      ],
    },
  },
})

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  components: [{ path: '~/components', ignore: ['**/ui/**'] }],
  modules: ['@nuxt/eslint', '@nuxt/icon', '@vueuse/nuxt', '@nuxtjs/sitemap'],
  css: ['@/assets/css/main.css'],
  // Icons: Material Design Icons bundled locally (no runtime calls to the
  // Iconify API) — keeps the toolkit privacy-first and offline-capable.
  icon: {
    mode: 'svg',
    serverBundle: { collections: ['mdi'] },
  },
  site: {
    url: 'https://example.com',
    name: 'Toolkit',
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
      meta: [{ name: 'color-scheme', content: 'light dark' }],
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

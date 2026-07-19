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
  app: {
    head: {
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

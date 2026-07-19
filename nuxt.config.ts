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
})

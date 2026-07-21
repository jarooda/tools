import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.{test,spec}.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./app', import.meta.url)),
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      // Mirrors the `#shared` alias Nuxt wires into both the app and Nitro.
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
})

// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import eslintConfigPrettier from 'eslint-config-prettier'
import typescriptParser from '@typescript-eslint/parser'

export default withNuxt(
  eslintConfigPrettier,
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: typescriptParser,
      },
    },
  },
  {
    rules: {
      'vue/html-self-closing': 'off',
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['app/components/ui/**'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    // Plain vendored `.ts` files (e.g. anchored-popup's composable) aren't
    // covered by the framework's own TS-aware config the way `.vue` files
    // are above, and fall back to the plain JS parser, which can't parse
    // real TypeScript syntax (interfaces, `import type`, …) at all.
    files: ['app/components/ui/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
    },
  },
)

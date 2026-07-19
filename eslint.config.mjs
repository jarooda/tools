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
)

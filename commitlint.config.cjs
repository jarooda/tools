const expectedTypes = [
  'feat',
  'fix',
  'docs',
  'chore',
  'style',
  'refactor',
  'ci',
  'test',
  'revert',
  'perf',
]

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', expectedTypes],
    'subject-case': [0, 'never', ['start-case', 'pascal-case']],
  },
  plugins: [
    {
      rules: {
        'type-enum': ({ type }) => {
          if (!expectedTypes.includes(type)) {
            return [
              false,
              `Commit message must in this format: <type>(<scope>): <subject>\n
- <type> is required and must be one of the following: ${expectedTypes.join(', ')}\n
- <scope> is optional and can be any string.\n
- <subject> is a short description of the change.\n

EXAMPLE:\n
feat(core): add new feature\n
fix(ui): fix a bug\n
docs(readme): update readme\n
ci(gitlab): update gitlab ci\n

Please refer to the CONTRIBUTING.md for more information.\n
              `,
            ]
          }
          return [true]
        },
      },
    },
  ],
}

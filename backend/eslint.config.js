const { defineConfig, globalIgnores } = require('eslint/config')
const tseslint = require('typescript-eslint')

module.exports = defineConfig([
  globalIgnores(['dist/', 'node_modules/', 'uploads/']),
  ...tseslint.configs.recommended,
  {
    // Camadas: modules/ e shared/ nunca importam admin/. Só app.ts compõe os dois.
    files: ['src/modules/**/*.ts', 'src/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/admin/**'],
              message: 'modules/ e shared/ nunca importam admin/.',
            },
          ],
        },
      ],
    },
  },
  {
    // arquivos de configuração em CommonJS
    files: ['*.config.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
])

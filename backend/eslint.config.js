const { defineConfig, globalIgnores } = require('eslint/config')
const tseslint = require('typescript-eslint')

module.exports = defineConfig([
  globalIgnores(['dist/', 'node_modules/', 'uploads/']),
  ...tseslint.configs.recommended,
  {
    // arquivos de configuração em CommonJS
    files: ['*.config.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
])

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 20_000, // bcrypt com custo 12 (RN-ACE-04) deixa os testes de senha lentos
    setupFiles: ['tests/helpers/assert-test-db.ts'],
    // Os testes nunca usam o banco de desenvolvimento nem o de produção.
    env: {
      NODE_ENV: 'test',
      APP_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5433/unishop_test',
      FRONTEND_URL: 'http://localhost:5173',
      JWT_SECRET: 'segredo-de-teste-com-pelo-menos-32-caracteres',
    },
  },
})

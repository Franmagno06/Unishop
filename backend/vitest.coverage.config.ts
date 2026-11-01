import { defineConfig } from 'vitest/config'

// Cobertura (D11): roda todos os testes (unitários, de integração e de banco) juntos, no PostgreSQL de
// teste. Limite de 80% em linhas, comandos e funções nos services de auth, payments, listings e
// orders; ramos só aparecem no relatório. Rode com `npm run test:coverage` (precisa do Docker de teste).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30_000,
    fileParallelism: false, // os testes de banco compartilham o mesmo banco
    globalSetup: ['tests/db/global-setup.ts'],
    setupFiles: ['tests/helpers/assert-test-db.ts'],
    env: {
      NODE_ENV: 'test',
      APP_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5433/unishop_test',
      DATABASE_URL_UNPOOLED: 'postgresql://test:test@localhost:5433/unishop_test',
      FRONTEND_URL: 'http://localhost:5173',
      JWT_SECRET: 'segredo-de-teste-com-pelo-menos-32-caracteres',
      CRON_SECRET: 'segredo-do-cron-de-teste',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**'],
      reporter: ['text-summary', 'text'],
      thresholds: {
        'src/modules/{auth,payments,listings,orders}/*.service.ts': {
          lines: 80,
          statements: 80,
          functions: 80,
        },
      },
    },
  },
})

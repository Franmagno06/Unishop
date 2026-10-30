import { defineConfig } from 'vitest/config'

// Testes que precisam do PostgreSQL real (docker-compose.test.yml, porta 5433): índices parciais,
// CHECK, view e concorrência. Rodam com `npm run test:db`; o `npm test` não os inclui.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/db/**/*.test.ts'],
    testTimeout: 30_000,
    fileParallelism: false, // todos os arquivos compartilham o mesmo banco
    globalSetup: ['tests/db/global-setup.ts'],
    setupFiles: ['tests/helpers/assert-test-db.ts'],
    env: {
      NODE_ENV: 'test',
      APP_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5433/unishop_test',
      DATABASE_URL_UNPOOLED: 'postgresql://test:test@localhost:5433/unishop_test',
      FRONTEND_URL: 'http://localhost:5173',
      JWT_SECRET: 'segredo-de-teste-com-pelo-menos-32-caracteres',
    },
  },
})

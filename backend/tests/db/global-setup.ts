import { execFileSync } from 'node:child_process'

// Aplica 0_init e 1_regras_manuais no banco de teste (vazio a cada `docker compose up`, tmpfs).
// A URL é fixada aqui e conferida: o .env de desenvolvimento nunca pode apontar a migração para
// outro banco (dotenv não sobrescreve variáveis já definidas).
const TEST_URL = 'postgresql://test:test@localhost:5433/unishop_test'

export default function setup() {
  if (!new URL(TEST_URL).pathname.endsWith('_test')) throw new Error('Banco de teste inválido.')
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_URL, DATABASE_URL_UNPOOLED: TEST_URL },
  })
}

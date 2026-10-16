// Roda antes de qualquer teste e aborta se o banco não for de testes (deploy.md §3.2).
const url = process.env.DATABASE_URL ?? ''
const dbName = url ? new URL(url).pathname.slice(1) : ''

if (process.env.NODE_ENV !== 'test' || !dbName.endsWith('_test')) {
  throw new Error(`Recusado: os testes só rodam em banco "*_test" (recebido: "${dbName}").`)
}

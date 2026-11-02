import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '../../config/env'
import { PrismaClient } from '../../generated/prisma/client'

// O cliente só conecta na primeira consulta; importar este arquivo não abre conexão.
// `max` limita as conexões de cada instância: o `connection_limit` da URL não vale para o adapter `pg`
// (o padrão seria 10 por instância, e a Vercel pode abrir várias; o pooler do Supabase tem teto).
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL, max: env.DATABASE_POOL_MAX }),
})
export type Db = PrismaClient

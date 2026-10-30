import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '../../config/env'
import { PrismaClient } from '../../generated/prisma/client'

// O cliente só conecta na primeira consulta; importar este arquivo não abre conexão.
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
})
export type Db = PrismaClient

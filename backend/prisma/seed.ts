import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { hashPassword } from '../src/shared/utils/hash'

// Seis categorias fixas (RN-CAT-01) e a conta admin, que só nasce aqui (RN-ADM-11).
// Idempotente: rodar duas vezes não duplica nada.
const CATEGORIES = [
  'Livros e apostilas',
  'Eletrônicos',
  'Alimentos',
  'Materiais de curso',
  'Vestuário',
  'Outros',
]

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })

async function main() {
  for (const name of CATEGORIES) {
    await db.category.upsert({ where: { name }, update: {}, create: { name } })
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    console.log('ADMIN_EMAIL/ADMIN_PASSWORD ausentes: categorias criadas, admin ignorado.')
    return
  }

  const exists = await db.$queryRaw<{ id: number }[]>`
    SELECT id_usuario AS id FROM usuario WHERE lower(email) = ${email} LIMIT 1`
  if (exists.length > 0) {
    console.log('Conta admin já existe: nada a fazer.')
    return
  }

  await db.user.create({
    data: {
      name: 'Administrador',
      email,
      passwordHash: await hashPassword(password),
      role: 'admin',
      verified: true,
      termsAcceptedAt: new Date(), // senão as rotas privadas responderiam TERMS_NOT_ACCEPTED
    },
  })
  console.log(`Conta admin criada: ${email}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())

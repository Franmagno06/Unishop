import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../src/generated/prisma/client'

// Cliente dos testes de banco. A URL vem do vitest.db.config.ts (unishop_test, porta 5433).
export const testDb = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

export const CATEGORY_NAMES = [
  'Livros e apostilas',
  'Eletrônicos',
  'Alimentos',
  'Materiais de curso',
  'Vestuário',
  'Outros',
]

// Esvazia tudo, zera os identity e recria as 6 categorias fixas (RN-CAT-01), com ids 1 a 6.
export async function resetDb() {
  await testDb.$executeRawUnsafe(
    'TRUNCATE TABLE log_admin, token_usuario, pagamento, pedido, imagem_anuncio, anuncio, categoria, usuario RESTART IDENTITY CASCADE',
  )
  await testDb.category.createMany({ data: CATEGORY_NAMES.map((name) => ({ name })) })
}

let seq = 0
const next = () => ++seq

type UserData = Parameters<typeof testDb.user.create>[0]['data']
type ListingData = Parameters<typeof testDb.listing.create>[0]['data']

export function createUser(overrides: Partial<UserData> = {}) {
  const n = next()
  return testDb.user.create({
    data: {
      name: `Aluno ${n}`,
      email: `aluno${n}@edu.unifor.br`,
      passwordHash: 'hash-de-teste',
      whatsapp: '85999990000',
      termsAcceptedAt: new Date(),
      ...overrides,
    },
  })
}

export function createListing(userId: number, overrides: Partial<ListingData> = {}) {
  const n = next()
  return testDb.listing.create({
    data: {
      name: `Anúncio ${n}`,
      description: 'Descrição de teste do anúncio.',
      price: '10.00',
      quantity: 1,
      whatsapp: '85999990000',
      userId,
      categoryId: 1,
      ...overrides,
    } as ListingData,
  })
}

type OrderData = Parameters<typeof testDb.order.create>[0]['data']

// Pedido direto no banco, para testar o que depende dele (exclusão, indicadores) sem o módulo de pedidos.
export function createOrder(
  listingId: number,
  buyerId: number,
  sellerId: number,
  overrides: Partial<OrderData> = {},
) {
  return testDb.order.create({
    data: {
      listingId,
      buyerId,
      sellerId,
      negotiationType: 'whatsapp',
      status: 'em_negociacao',
      productName: 'Produto de teste',
      quantity: 1,
      unitPrice: '10.00',
      totalAmount: '10.00',
      ...overrides,
    } as OrderData,
  })
}

import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildDbApp } from '../helpers/db-app'
import { createListing, createUser, resetDb, testDb } from '../helpers/db'

// Área admin de produtos (RN-ADM-07, 08, 10), com o banco real.
const { app, auth } = buildDbApp()

let admin: Awaited<ReturnType<typeof createUser>>
let seller: Awaited<ReturnType<typeof createUser>>

beforeEach(async () => {
  await resetDb()
  admin = await createUser({ name: 'Admin Um', role: 'admin' })
  seller = await createUser({ name: 'Ana Vendedora' })
})

const DAY = 24 * 60 * 60_000
const adminAuth = () => auth({ id: admin.id, role: 'admin' })
const get = (path: string, query: object = {}) =>
  request(app).get(`/api/v1/admin/listings${path}`).query(query).set(adminAuth())

describe('GET /admin/listings/stats', () => {
  it('RN-ADM-07: estatísticas de ativos e pausados ignoram excluídos', async () => {
    await createListing(seller.id)
    await createListing(seller.id)
    await createListing(seller.id, { deletedAt: new Date() })
    await createListing(seller.id, { status: 'pausado' })
    await createListing(seller.id, { status: 'pausado', deletedAt: new Date() })
    const res = await get('/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ active: 2, paused: 1 })
  })

  it('RN-ADM-07: vendidos no mês usam vendido_em e ignoram excluídos', async () => {
    await createListing(seller.id, { status: 'vendido', quantity: 0, soldAt: new Date() })
    await createListing(seller.id, {
      status: 'vendido',
      quantity: 0,
      soldAt: new Date(Date.now() - 70 * DAY),
    })
    await createListing(seller.id, {
      status: 'vendido',
      quantity: 0,
      soldAt: new Date(),
      deletedAt: new Date(),
    })
    expect((await get('/stats')).body.data.soldInMonth).toBe(1)
  })
})

describe('GET /admin/listings', () => {
  it('RN-ADM-07: lista inclui anúncios pausados, vendidos e de dono suspenso, mas não os excluídos', async () => {
    const suspended = await createUser({ accountStatus: 'suspensa' })
    await createListing(seller.id, { name: 'Ativo' })
    await createListing(seller.id, { name: 'Pausado', status: 'pausado' })
    await createListing(seller.id, { name: 'Vendido', status: 'vendido', quantity: 0 })
    await createListing(suspended.id, { name: 'De suspenso' })
    await createListing(seller.id, { name: 'Excluído', deletedAt: new Date() })
    const res = await get('')
    expect(res.status).toBe(200)
    expect((res.body.data as { title: string }[]).map((l) => l.title).sort()).toEqual([
      'Ativo',
      'De suspenso',
      'Pausado',
      'Vendido',
    ])
  })

  it('RN-ADM-07: busca pelo nome do anúncio ou do vendedor', async () => {
    const bruno = await createUser({ name: 'Bruno Lima' })
    await createListing(seller.id, { name: 'Calculadora' })
    await createListing(bruno.id, { name: 'Livro de Cálculo' })
    await createListing(bruno.id, { name: 'Mochila' })
    const titles = async (search: string) =>
      ((await get('', { search })).body.data as { title: string }[]).map((l) => l.title).sort()
    expect(await titles('cálcul')).toEqual(['Livro de Cálculo'])
    expect(await titles('ANA VEND')).toEqual(['Calculadora'])
    expect(await titles('bruno')).toEqual(['Livro de Cálculo', 'Mochila'])
    expect(await titles('%')).toEqual([])
  })

  it('RN-ADM-07: filtra por categoria e pagina com meta', async () => {
    for (let i = 0; i < 3; i++) await createListing(seller.id, { categoryId: 2 })
    await createListing(seller.id, { categoryId: 3 })
    const res = await get('', { category: 2, page: 2, limit: 2 })
    expect(res.body.data).toHaveLength(1)
    expect(res.body.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 })
    expect(res.body.data[0]).toMatchObject({ categoryId: 2, categoryName: 'Eletrônicos' })
    expect(res.body.data[0].seller).toEqual({ id: seller.id, name: 'Ana Vendedora' })
  })

  it('RN-ADM-07: a lista traz a imagem principal e o preço em centavos', async () => {
    const l = await createListing(seller.id, { price: '12.34' })
    await testDb.listingImage.create({
      data: { listingId: l.id, position: 1, url: 'http://x/1.png', publicId: 'a' },
    })
    const row = (await get('')).body.data[0]
    expect(row).toMatchObject({ priceInCents: 1234, imageUrl: 'http://x/1.png', status: 'active' })
  })
})

describe('GET /admin/listings/:id', () => {
  it('RF023: detalhe mostra dados, imagens, vendedor e indicadores; 404 para excluído ou inexistente', async () => {
    const l = await createListing(seller.id, {
      name: 'Livro',
      views: 7,
      contacts: 3,
      whatsapp: '85988887777',
    })
    await testDb.listingImage.createMany({
      data: [
        { listingId: l.id, position: 2, url: 'http://x/2.png', publicId: 'b' },
        { listingId: l.id, position: 1, url: 'http://x/1.png', publicId: 'a' },
      ],
    })
    const res = await get(`/${l.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      id: l.id,
      title: 'Livro',
      priceInCents: 1000,
      quantity: 1,
      categoryName: 'Livros e apostilas',
      status: 'active',
      whatsapp: '85988887777',
      views: 7,
      whatsappContacts: 3,
      seller: {
        id: seller.id,
        name: 'Ana Vendedora',
        email: seller.email,
        whatsapp: '85999990000',
      },
    })
    expect(res.body.data.images.map((i: { position: number }) => i.position)).toEqual([1, 2])

    const gone = await createListing(seller.id, { deletedAt: new Date() })
    expect((await get(`/${gone.id}`)).status).toBe(404)
    expect((await get('/99999')).status).toBe(404)
    expect((await get('/abc')).status).toBe(400)
  })
})

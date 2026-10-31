import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildDbApp } from '../helpers/db-app'
import { createListing, createUser, resetDb, testDb } from '../helpers/db'

// Rotas de anúncios com o banco real: filtro único de visibilidade, busca, faixa de preço,
// ordenação e paginação (RN-ANU-05 a 07, RN-ANU-11).
const { app, auth } = buildDbApp()

let seller: Awaited<ReturnType<typeof createUser>>
let buyer: Awaited<ReturnType<typeof createUser>>

beforeEach(async () => {
  await resetDb()
  seller = await createUser({ name: 'Ana Souza', course: 'Ciência da Computação' })
  buyer = await createUser({ name: 'Bruno Lima' })
})

const list = (query = '') => request(app).get(`/api/v1/listings${query}`).set(auth(buyer))
const titles = (res: request.Response) => res.body.data.map((i: { title: string }) => i.title)

describe('GET /listings (banco real)', () => {
  it('RN-ANU-05: só lista anúncio ativo, não excluído, de dono com conta ativa', async () => {
    const suspended = await createUser({ accountStatus: 'suspensa' })
    await createListing(seller.id, { name: 'Visível' })
    await createListing(seller.id, { name: 'Pausado', status: 'pausado' })
    await createListing(seller.id, { name: 'Vendido', status: 'vendido', quantity: 0 })
    await createListing(seller.id, { name: 'Excluído', deletedAt: new Date() })
    await createListing(suspended.id, { name: 'Dono suspenso' })

    const res = await list()
    expect(titles(res)).toEqual(['Visível'])
    expect(res.body.meta.total).toBe(1)
  })

  it('filtra por categoria', async () => {
    await createListing(seller.id, { name: 'Livro', categoryId: 1 })
    await createListing(seller.id, { name: 'Fone', categoryId: 2 })
    expect(titles(await list('?category=2'))).toEqual(['Fone'])
  })

  it('RN-CAT-03: busca no nome e na descrição, sem diferenciar maiúsculas', async () => {
    await createListing(seller.id, {
      name: 'Calculadora HP 12C',
      description: 'Quase nova, na caixa.',
    })
    await createListing(seller.id, {
      name: 'Caderno',
      description: 'Serve para HP e outras calculadoras.',
    })
    await createListing(seller.id, { name: 'Mochila', description: 'Resistente à água, sem uso.' })

    const res = await list('?search=calculadora')
    expect(titles(res).sort()).toEqual(['Caderno', 'Calculadora HP 12C'])
    expect(titles(await list('?search=MOCHILA'))).toEqual(['Mochila'])
  })

  it('a busca trata % e _ como texto comum, não como curinga', async () => {
    await createListing(seller.id, { name: 'Promoção 100% algodão' })
    await createListing(seller.id, { name: 'Camiseta lisa' })
    expect(titles(await list('?search=%25'))).toEqual(['Promoção 100% algodão'])
    expect(titles(await list('?search=_'))).toEqual([])
    expect(titles(await list('?search=alg_d'))).toEqual([]) // '_' casaria com 'o' se fosse curinga
  })

  it('RN-ANU-06: faixa de preço em reais, com os limites incluídos', async () => {
    await createListing(seller.id, { name: 'R$ 19,99', price: '19.99' })
    await createListing(seller.id, { name: 'R$ 20,00', price: '20.00' })
    await createListing(seller.id, { name: 'R$ 50,00', price: '50.00' })
    await createListing(seller.id, { name: 'R$ 80,00', price: '80.00' })
    await createListing(seller.id, { name: 'R$ 80,01', price: '80.01' })

    const res = await list('?minPrice=20&maxPrice=80&sort=price_asc')
    expect(titles(res)).toEqual(['R$ 20,00', 'R$ 50,00', 'R$ 80,00'])
    expect(titles(await list('?minPrice=80.01&sort=price_asc'))).toEqual(['R$ 80,01'])
  })

  it('RN-ANU-06: ordena por preço crescente e decrescente', async () => {
    await createListing(seller.id, { name: 'B', price: '30.00' })
    await createListing(seller.id, { name: 'A', price: '10.00' })
    await createListing(seller.id, { name: 'C', price: '20.00' })
    expect(titles(await list('?sort=price_asc'))).toEqual(['A', 'C', 'B'])
    expect(titles(await list('?sort=price_desc'))).toEqual(['B', 'C', 'A'])
  })

  it('RN-ANU-07: por padrão o anúncio mais novo vem primeiro', async () => {
    await createListing(seller.id, {
      name: 'Antigo',
      publishedAt: new Date('2026-09-01T10:00:00Z'),
    })
    await createListing(seller.id, { name: 'Novo', publishedAt: new Date('2026-10-20T10:00:00Z') })
    await createListing(seller.id, { name: 'Médio', publishedAt: new Date('2026-10-01T10:00:00Z') })
    expect(titles(await list())).toEqual(['Novo', 'Médio', 'Antigo'])
  })

  it('pagina com o total correto', async () => {
    for (let i = 1; i <= 5; i++) {
      await createListing(seller.id, { name: `Item ${i}`, price: `${i}.00` })
    }
    const page2 = await list('?sort=price_asc&page=2&limit=2')
    expect(titles(page2)).toEqual(['Item 3', 'Item 4'])
    expect(page2.body.meta).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 })
    expect(titles(await list('?sort=price_asc&page=3&limit=2'))).toEqual(['Item 5'])
  })

  it('cada item traz a imagem principal (ordem 1) e a categoria, sem WhatsApp', async () => {
    const listing = await createListing(seller.id, { name: 'Com fotos', categoryId: 2 })
    await testDb.listingImage.createMany({
      data: [
        { listingId: listing.id, url: 'http://x/2.png', publicId: 'p2', position: 2 },
        { listingId: listing.id, url: 'http://x/1.png', publicId: 'p1', position: 1 },
      ],
    })
    await createListing(seller.id, { name: 'Sem foto' })

    const res = await list('?sort=price_asc&category=2')
    expect(res.body.data[0]).toMatchObject({
      title: 'Com fotos',
      imageUrl: 'http://x/1.png',
      categoryId: 2,
      categoryName: 'Eletrônicos',
      priceInCents: 1000,
    })
    expect(JSON.stringify(res.body)).not.toMatch(/whatsapp/i)
    expect((await list('?category=1')).body.data[0].imageUrl).toBeNull()
  })
})

describe('GET /listings/recent (banco real)', () => {
  it('RF001.4: é pública, traz os mais novos primeiro e só os visíveis', async () => {
    await createListing(seller.id, {
      name: 'Antigo',
      publishedAt: new Date('2026-09-01T10:00:00Z'),
    })
    await createListing(seller.id, { name: 'Novo', publishedAt: new Date('2026-10-20T10:00:00Z') })
    await createListing(seller.id, { name: 'Pausado', status: 'pausado' })

    const res = await request(app).get('/api/v1/listings/recent?limit=5')
    expect(res.status).toBe(200)
    expect(titles(res)).toEqual(['Novo', 'Antigo'])
    expect(JSON.stringify(res.body)).not.toMatch(/whatsapp/i)
  })
})

describe('GET /listings/:id (banco real)', () => {
  it('RN-ANU-11: grava +1 visualização para terceiros e não para o dono', async () => {
    const listing = await createListing(seller.id)
    await request(app).get(`/api/v1/listings/${listing.id}`).set(auth(buyer))
    await request(app).get(`/api/v1/listings/${listing.id}`).set(auth(buyer))
    await request(app).get(`/api/v1/listings/${listing.id}`).set(auth(seller))

    const after = await testDb.listing.findUniqueOrThrow({ where: { id: listing.id } })
    expect(after.views).toBe(2)
  })

  it('RF008: devolve a galeria em ordem, o vendedor e o WhatsApp do anúncio', async () => {
    const listing = await createListing(seller.id, { whatsapp: '85988887777' })
    await testDb.listingImage.createMany({
      data: [
        { listingId: listing.id, url: 'http://x/b.png', publicId: 'b', position: 2 },
        { listingId: listing.id, url: 'http://x/a.png', publicId: 'a', position: 1 },
      ],
    })

    const res = await request(app).get(`/api/v1/listings/${listing.id}`).set(auth(buyer))
    expect(res.status).toBe(200)
    expect(res.body.data.images.map((i: { url: string }) => i.url)).toEqual([
      'http://x/a.png',
      'http://x/b.png',
    ])
    expect(res.body.data.whatsapp).toBe('85988887777')
    expect(res.body.data.seller).toEqual({
      name: 'Ana Souza',
      course: 'Ciência da Computação',
      verified: false,
    })
    expect(res.body.data.isOwn).toBe(false)
  })

  it('RN-ANU-05: pausado e dono suspenso dão 404 a terceiros; o dono vê o próprio pausado', async () => {
    const paused = await createListing(seller.id, { status: 'pausado' })
    const suspended = await createUser({ accountStatus: 'suspensa' })
    const hidden = await createListing(suspended.id)

    expect((await request(app).get(`/api/v1/listings/${paused.id}`).set(auth(buyer))).status).toBe(
      404,
    )
    expect((await request(app).get(`/api/v1/listings/${hidden.id}`).set(auth(buyer))).status).toBe(
      404,
    )
    expect((await request(app).get(`/api/v1/listings/${paused.id}`).set(auth(seller))).status).toBe(
      200,
    )
  })
})

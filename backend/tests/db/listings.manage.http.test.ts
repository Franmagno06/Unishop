import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildDbApp } from '../helpers/db-app'
import { createListing, createOrder, createUser, resetDb, testDb } from '../helpers/db'

// Gerenciar anúncios (RN-ANU-04, 05, 08, 09; RN-EST-06), com o banco real.
const { app, auth } = buildDbApp()

let seller: Awaited<ReturnType<typeof createUser>>
let other: Awaited<ReturnType<typeof createUser>>
let admin: Awaited<ReturnType<typeof createUser>>
type Actor = { id: number; role?: 'admin' }

beforeEach(async () => {
  await resetDb()
  seller = await createUser({ name: 'Ana Souza' })
  other = await createUser({ name: 'Bruno Lima' })
  admin = await createUser({ role: 'admin' })
})

const as = (u: Actor) => ({ id: u.id, ...(u.role && { role: u.role }) })
const call = (method: 'get' | 'post' | 'patch' | 'delete', path: string, user: Actor = seller) =>
  request(app)
    [method](`/api/v1/listings${path}`)
    .set(auth(as(user)))
const statusOf = async (id: number) =>
  (await testDb.listing.findUniqueOrThrow({ where: { id } })).status

describe('GET /listings/mine', () => {
  it('RF012.5: lista os próprios anúncios em todos os status, menos os excluídos, do mais novo', async () => {
    await createListing(seller.id, { name: 'Ativo', publishedAt: new Date('2026-10-01T10:00:00Z') })
    await createListing(seller.id, {
      name: 'Pausado',
      status: 'pausado',
      publishedAt: new Date('2026-10-03T10:00:00Z'),
    })
    await createListing(seller.id, {
      name: 'Vendido',
      status: 'vendido',
      quantity: 0,
      publishedAt: new Date('2026-10-02T10:00:00Z'),
    })
    await createListing(seller.id, { name: 'Excluído', deletedAt: new Date() })
    await createListing(other.id, { name: 'De outro aluno' })

    const res = await call('get', '/mine')
    expect(res.status).toBe(200)
    expect(res.body.data.map((l: { title: string }) => l.title)).toEqual([
      'Pausado',
      'Vendido',
      'Ativo',
    ])
    expect(res.body.data.map((l: { status: string }) => l.status)).toEqual([
      'paused',
      'sold',
      'active',
    ])
    expect(res.body.data[0]).toMatchObject({
      whatsapp: '85999990000',
      views: 0,
      whatsappContacts: 0,
    })
  })

  it('visitante recebe 401', async () => {
    expect((await request(app).get('/api/v1/listings/mine')).status).toBe(401)
  })
})

describe('GET /listings/:id/management', () => {
  it('RN-ANU-08: devolve o anúncio e os indicadores de visualizações, contatos e pedidos', async () => {
    const listing = await createListing(seller.id, { contacts: 3 })
    await request(app).get(`/api/v1/listings/${listing.id}`).set(auth(other))
    await request(app).get(`/api/v1/listings/${listing.id}`).set(auth(other))
    await createOrder(listing.id, other.id, seller.id)
    await createOrder(listing.id, admin.id, seller.id, { status: 'cancelado' })

    const res = await call('get', `/${listing.id}/management`)
    expect(res.status).toBe(200)
    expect(res.body.data.indicators).toEqual({ views: 2, contacts: 3, orders: 2 })
    expect(res.body.data.listing).toMatchObject({ id: listing.id, status: 'active' })
  })

  it('RN-ANU-04: terceiro e admin recebem 403; anúncio oculto de outro dá 404; visitante 401', async () => {
    const listing = await createListing(seller.id)
    const paused = await createListing(seller.id, { status: 'pausado' })
    expect((await call('get', `/${listing.id}/management`, other)).status).toBe(403)
    expect((await call('get', `/${listing.id}/management`, admin)).status).toBe(403)
    expect((await call('get', `/${paused.id}/management`, other)).status).toBe(404)
    expect((await request(app).get(`/api/v1/listings/${listing.id}/management`)).status).toBe(401)
  })
})

describe('PATCH /listings/:id', () => {
  it('RN-ANU-04: o dono edita os dados do anúncio', async () => {
    const listing = await createListing(seller.id, { name: 'Antigo' })
    const res = await call('patch', `/${listing.id}`).send({
      title: 'Novo título',
      priceInCents: 2599,
      quantity: 4,
      categoryId: 2,
      whatsapp: '(85) 98888-7777',
    })
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      title: 'Novo título',
      priceInCents: 2599,
      quantity: 4,
      categoryId: 2,
    })

    const row = await testDb.listing.findUniqueOrThrow({ where: { id: listing.id } })
    expect(row.whatsapp).toBe('85988887777')
    expect(row.price.toString()).toBe('25.99')
  })

  it('RN-ANU-04: ignora campos que o dono não pode mudar (status, dono, contadores)', async () => {
    const listing = await createListing(seller.id)
    await call('patch', `/${listing.id}`).send({
      title: 'Só o título',
      status: 'vendido',
      userId: other.id,
      views: 99,
    })
    const row = await testDb.listing.findUniqueOrThrow({ where: { id: listing.id } })
    expect(row.name).toBe('Só o título')
    expect([row.status, row.userId, row.views]).toEqual(['ativo', seller.id, 0])
  })

  it.each([
    ['corpo vazio', {}],
    ['preço zero', { priceInCents: 0 }],
    ['quantidade acima de 999', { quantity: 1000 }],
    ['título com 2 caracteres', { title: 'ab' }],
    ['descrição com HTML', { description: 'Texto <b>negrito</b> aqui dentro' }],
    ['WhatsApp vazio', { whatsapp: '' }],
    ['categoria inexistente', { categoryId: 99 }],
  ])('RN-ANU-12: %s dá 400', async (_nome, body) => {
    const listing = await createListing(seller.id)
    const res = await call('patch', `/${listing.id}`).send(body)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('anúncio vendido não se edita (409 INVALID_STATE)', async () => {
    const sold = await createListing(seller.id, { status: 'vendido', quantity: 0 })
    const res = await call('patch', `/${sold.id}`).send({ title: 'Tentativa' })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('INVALID_STATE')
  })

  it('RN-ANU-04: terceiro e admin recebem 403, oculto de outro 404, visitante 401', async () => {
    const listing = await createListing(seller.id)
    const paused = await createListing(seller.id, { status: 'pausado' })
    expect((await call('patch', `/${listing.id}`, other).send({ title: 'Invasão' })).status).toBe(
      403,
    )
    expect((await call('patch', `/${listing.id}`, admin).send({ title: 'Invasão' })).status).toBe(
      403,
    )
    expect((await call('patch', `/${paused.id}`, other).send({ title: 'Invasão' })).status).toBe(
      404,
    )
    expect(
      (await request(app).patch(`/api/v1/listings/${listing.id}`).send({ title: 'x' })).status,
    ).toBe(401)
    expect((await testDb.listing.findUniqueOrThrow({ where: { id: listing.id } })).name).not.toBe(
      'Invasão',
    )
  })
})

describe('pausar, reativar e marcar como vendido', () => {
  it('RN-ANU-04 e RN-ANU-05: pausar tira o anúncio da listagem e reativar devolve', async () => {
    const listing = await createListing(seller.id)
    const inList = async () =>
      (await request(app).get('/api/v1/listings').set(auth(other))).body.data.length

    expect((await call('post', `/${listing.id}/pause`)).status).toBe(200)
    expect(await statusOf(listing.id)).toBe('pausado')
    expect(await inList()).toBe(0)

    const res = await call('post', `/${listing.id}/reactivate`)
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('active')
    expect(await inList()).toBe(1)
  })

  it('RF017.9 e RN-EST-06: marcar como vendido zera as unidades e grava a data', async () => {
    const listing = await createListing(seller.id, { quantity: 5 })
    const res = await call('post', `/${listing.id}/mark-sold`)
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ status: 'sold', quantity: 0 })

    const row = await testDb.listing.findUniqueOrThrow({ where: { id: listing.id } })
    expect([row.status, row.quantity]).toEqual(['vendido', 0])
    expect(row.soldAt).not.toBeNull()
  })

  it('também marca como vendido um anúncio pausado', async () => {
    const listing = await createListing(seller.id, { status: 'pausado' })
    expect((await call('post', `/${listing.id}/mark-sold`)).status).toBe(200)
  })

  it('RN-ANU-04: o dono não reverte Vendido (só o admin, na etapa do admin)', async () => {
    const sold = await createListing(seller.id, { status: 'vendido', quantity: 0 })
    for (const action of ['reactivate', 'pause', 'mark-sold']) {
      const res = await call('post', `/${sold.id}/${action}`)
      expect(res.status).toBe(409)
      expect(res.body.error.code).toBe('INVALID_STATE')
    }
    expect(await statusOf(sold.id)).toBe('vendido')
  })

  it('transições inválidas dão 409: pausar o pausado e reativar o ativo', async () => {
    const active = await createListing(seller.id)
    const paused = await createListing(seller.id, { status: 'pausado' })
    expect((await call('post', `/${active.id}/reactivate`)).status).toBe(409)
    expect((await call('post', `/${paused.id}/pause`)).status).toBe(409)
  })

  it('RN-ANU-04: terceiro e admin recebem 403 e nada muda', async () => {
    const listing = await createListing(seller.id)
    for (const action of ['pause', 'mark-sold']) {
      expect((await call('post', `/${listing.id}/${action}`, other)).status).toBe(403)
      expect((await call('post', `/${listing.id}/${action}`, admin)).status).toBe(403)
    }
    expect(await statusOf(listing.id)).toBe('ativo')
  })

  it('RN-ADM-05: conta suspensa não reativa (o login já barra com ACCOUNT_SUSPENDED)', async () => {
    const paused = await createListing(seller.id, { status: 'pausado' })
    await testDb.user.update({ where: { id: seller.id }, data: { accountStatus: 'suspensa' } })
    const res = await call('post', `/${paused.id}/reactivate`)
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED')
    expect(await statusOf(paused.id)).toBe('pausado')
  })
})

describe('DELETE /listings/:id', () => {
  it('RN-ANU-09: exclusão lógica; o anúncio some de tudo e as imagens ficam', async () => {
    const listing = await createListing(seller.id)
    await testDb.listingImage.create({
      data: { listingId: listing.id, url: 'http://x/a.png', publicId: 'a', position: 1 },
    })

    const res = await call('delete', `/${listing.id}`)
    expect(res.status).toBe(204)

    const row = await testDb.listing.findUniqueOrThrow({ where: { id: listing.id } })
    expect(row.deletedAt).not.toBeNull()
    expect(await testDb.listingImage.count({ where: { listingId: listing.id } })).toBe(1)
    expect((await call('get', '/mine')).body.data).toHaveLength(0)
    expect((await call('get', `/${listing.id}`)).status).toBe(404)
    expect((await request(app).get('/api/v1/listings').set(auth(other))).body.data).toHaveLength(0)
  })

  it.each(['pago', 'retirada_combinada'])(
    'RN-ANU-09: pedido %s em aberto bloqueia a exclusão (409 HAS_OPEN_PAID_ORDERS)',
    async (status) => {
      const listing = await createListing(seller.id)
      await createOrder(listing.id, other.id, seller.id, {
        status,
        negotiationType: 'pagamento_site',
      })

      const res = await call('delete', `/${listing.id}`)
      expect(res.status).toBe(409)
      expect(res.body.error.code).toBe('HAS_OPEN_PAID_ORDERS')
      expect(
        (await testDb.listing.findUniqueOrThrow({ where: { id: listing.id } })).deletedAt,
      ).toBeNull()
    },
  )

  it('RN-ANU-09: pedido concluído ou cancelado não bloqueia', async () => {
    const listing = await createListing(seller.id)
    await createOrder(listing.id, other.id, seller.id, { status: 'concluido' })
    await createOrder(listing.id, admin.id, seller.id, { status: 'cancelado' })
    expect((await call('delete', `/${listing.id}`)).status).toBe(204)
  })

  it('RN-ANU-04: terceiro e admin recebem 403; oculto de outro 404; excluído de novo 404; visitante 401', async () => {
    const listing = await createListing(seller.id)
    const paused = await createListing(seller.id, { status: 'pausado' })
    expect((await call('delete', `/${listing.id}`, other)).status).toBe(403)
    expect((await call('delete', `/${listing.id}`, admin)).status).toBe(403)
    expect((await call('delete', `/${paused.id}`, other)).status).toBe(404)
    expect((await request(app).delete(`/api/v1/listings/${listing.id}`)).status).toBe(401)

    expect((await call('delete', `/${listing.id}`)).status).toBe(204)
    expect((await call('delete', `/${listing.id}`)).status).toBe(404)
  })
})

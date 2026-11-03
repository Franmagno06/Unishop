import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildDbApp } from '../helpers/db-app'
import { createListing, createOrder, createUser, resetDb, testDb } from '../helpers/db'

// Avaliações (RN-AVA-01 a 05) contra o banco real.
const { app, auth } = buildDbApp()

type U = Awaited<ReturnType<typeof createUser>>
let seller: U
let buyer: U
let listing: Awaited<ReturnType<typeof createListing>>
let order: Awaited<ReturnType<typeof createOrder>>

beforeEach(async () => {
  await resetDb()
  seller = await createUser()
  buyer = await createUser({ name: 'Ana Compradora' })
  listing = await createListing(seller.id)
  order = await createOrder(listing.id, buyer.id, seller.id, {
    status: 'concluido',
    completedAt: new Date(),
  })
})

const review = (
  who: { id: number; role?: 'student' | 'admin' },
  body: object,
  orderId = order.id,
) => request(app).post(`/api/v1/orders/${orderId}/review`).set(auth(who)).send(body)
const list = (who: { id: number; role?: 'student' | 'admin' }, listingId = listing.id) =>
  request(app).get(`/api/v1/listings/${listingId}/reviews`).set(auth(who))

describe('avaliar (POST /orders/:id/review)', () => {
  it('RN-AVA-01: o comprador avalia o pedido concluído (201) e a avaliação é gravada', async () => {
    const res = await review(buyer, { rating: 4.5, comment: '  Item ótimo  ' })
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      listingId: listing.id,
      authorName: 'Ana Compradora',
      rating: 4.5,
      comment: 'Item ótimo',
    })
    const row = await testDb.review.findUniqueOrThrow({ where: { orderId: order.id } })
    expect(row).toMatchObject({ listingId: listing.id, authorId: buyer.id })
    expect(Number(row.rating)).toBe(4.5)
  })

  it('RN-AVA-04: comentário é opcional', async () => {
    const res = await review(buyer, { rating: 0 })
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ rating: 0, comment: '' })
  })

  it('RN-AVA-01: o vendedor do pedido e outro aluno não avaliam (403)', async () => {
    const other = await createUser()
    expect((await review(seller, { rating: 5 })).status).toBe(403)
    expect((await review(other, { rating: 5 })).status).toBe(403)
    expect(await testDb.review.count()).toBe(0)
  })

  it('RN-AVA-01: pedido inexistente = 404', async () => {
    expect((await review(buyer, { rating: 5 }, 9999)).status).toBe(404)
  })

  it.each(['pendente', 'pago', 'retirada_combinada', 'em_negociacao', 'cancelado'])(
    'RN-AVA-01: pedido %s não pode ser avaliado (409 INVALID_STATE)',
    async (status) => {
      const open = await createOrder(listing.id, buyer.id, seller.id, { status })
      const res = await review(buyer, { rating: 5 }, open.id)
      expect(res.status).toBe(409)
      expect(res.body.error.code).toBe('INVALID_STATE')
    },
  )

  it('RN-AVA-02: segunda avaliação do mesmo pedido = 409 ALREADY_REVIEWED', async () => {
    expect((await review(buyer, { rating: 5 })).status).toBe(201)
    const again = await review(buyer, { rating: 1 })
    expect(again.status).toBe(409)
    expect(again.body.error.code).toBe('ALREADY_REVIEWED')
    expect(await testDb.review.count()).toBe(1)
  })

  it('RN-AVA-02: duas avaliações ao mesmo tempo gravam só uma', async () => {
    const results = await Promise.all([review(buyer, { rating: 5 }), review(buyer, { rating: 4 })])
    expect(results.map((r) => r.status).sort()).toEqual([201, 409])
    expect(await testDb.review.count()).toBe(1)
  })

  it('RN-AVA-03: nota fora do passo ou do intervalo = 400; RN-AVA-04: comentário acima de 500 = 400', async () => {
    for (const rating of [-1, 5.5, 4.3, '5', null]) {
      expect((await review(buyer, { rating })).status).toBe(400)
    }
    expect((await review(buyer, { rating: 5, comment: 'a'.repeat(501) })).status).toBe(400)
    expect((await review(buyer, { rating: 5, extra: true })).status).toBe(400)
    expect((await review(buyer, {})).status).toBe(400)
    expect(await testDb.review.count()).toBe(0)
  })

  it('RN §3: admin não avalia (403) e visitante sem login = 401', async () => {
    const admin = await createUser({ role: 'admin' })
    expect((await review({ id: admin.id, role: 'admin' }, { rating: 5 })).status).toBe(403)
    const anon = await request(app).post(`/api/v1/orders/${order.id}/review`).send({ rating: 5 })
    expect(anon.status).toBe(401)
  })

  it('o banco recusa nota fora do passo mesmo fora da API (ck_avaliacao_nota)', async () => {
    const insert = (rating: string) =>
      testDb.$executeRawUnsafe(
        `INSERT INTO avaliacao (id_pedido, id_anuncio, id_avaliador, nota) VALUES (${order.id}, ${listing.id}, ${buyer.id}, ${rating})`,
      )
    await expect(insert('4.7')).rejects.toThrow()
    await expect(insert('5.5')).rejects.toThrow()
    await expect(insert('-0.5')).rejects.toThrow()
    await expect(insert('3.5')).resolves.toBeDefined()
  })
})

describe('listar (GET /listings/:id/reviews)', () => {
  it('RN-AVA-05: logado lê as avaliações, da mais recente para a mais antiga', async () => {
    const second = await createOrder(
      listing.id,
      (await createUser({ name: 'Bia' })).id,
      seller.id,
      {
        status: 'concluido',
      },
    )
    const bia = await testDb.user.findFirstOrThrow({ where: { name: 'Bia' } })
    await testDb.review.create({
      data: {
        orderId: order.id,
        listingId: listing.id,
        authorId: buyer.id,
        rating: 5,
        comment: 'antiga',
        createdAt: new Date('2026-10-01T10:00:00Z'),
      },
    })
    await testDb.review.create({
      data: {
        orderId: second.id,
        listingId: listing.id,
        authorId: bia.id,
        rating: 2,
        comment: 'nova',
        createdAt: new Date('2026-10-05T10:00:00Z'),
      },
    })
    const res = await list(buyer)
    expect(res.status).toBe(200)
    expect(res.body.data.map((r: { comment: string }) => r.comment)).toEqual(['nova', 'antiga'])
    expect(res.body.data[0]).toMatchObject({ authorName: 'Bia', rating: 2, listingId: listing.id })
    expect(res.body.data[0].createdAt).toBe('2026-10-05T10:00:00.000Z')
  })

  it('RN-AVA-05: anúncio sem avaliação devolve lista vazia; o admin também lê', async () => {
    const admin = await createUser({ role: 'admin' })
    const res = await list({ id: admin.id, role: 'admin' })
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })

  it('RN-AVA-05: visitante sem login = 401; anúncio inexistente ou excluído = 404', async () => {
    expect((await request(app).get(`/api/v1/listings/${listing.id}/reviews`)).status).toBe(401)
    expect((await list(buyer, 9999)).status).toBe(404)
    await testDb.listing.update({ where: { id: listing.id }, data: { deletedAt: new Date() } })
    expect((await list(buyer)).status).toBe(404)
  })
})

describe('pedido e avaliação', () => {
  it('RN-AVA-02: o JSON do pedido traz reviewed (GET /orders/:id e /orders/mine)', async () => {
    const get = () => request(app).get(`/api/v1/orders/${order.id}`).set(auth(buyer))
    const mine = () => request(app).get('/api/v1/orders/mine').set(auth(buyer))
    expect((await get()).body.data.reviewed).toBe(false)
    expect((await mine()).body.data[0].reviewed).toBe(false)
    await review(buyer, { rating: 4 })
    expect((await get()).body.data.reviewed).toBe(true)
    expect((await mine()).body.data[0].reviewed).toBe(true)
  })

  it('RN-PER-06: ao excluir a conta, a avaliação fica e o autor vira "Usuário removido"', async () => {
    await review(buyer, { rating: 3, comment: 'ok' })
    const del = await request(app)
      .delete('/api/v1/users/me')
      .set(auth(buyer))
      .send({ confirmation: 'EXCLUIR' })
    expect(del.status).toBe(204)
    const res = await list(seller)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0]).toMatchObject({ authorName: 'Usuário removido', rating: 3 })
  })
})

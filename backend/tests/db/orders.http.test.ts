import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { flushBackground } from '../../src/shared/utils/background'
import { buildDbApp } from '../helpers/db-app'
import { createListing, createOrder, createUser, resetDb, testDb } from '../helpers/db'

// Pedidos (backend.md §9.5, RN-PED-01 a 13, RN-EST-02 a 06) contra o banco real.
const { app, auth, gateway } = buildDbApp()

let seller: Awaited<ReturnType<typeof createUser>>
let buyer: Awaited<ReturnType<typeof createUser>>
let listing: Awaited<ReturnType<typeof createListing>>

beforeEach(async () => {
  await resetDb()
  seller = await createUser()
  buyer = await createUser()
  listing = await createListing(seller.id, { price: '45.00', quantity: 3 })
})

const post = (path: string, who: { id: number; role?: 'student' | 'admin' }, body?: object) =>
  request(app).post(`/api/v1/orders${path}`).set(auth(who)).send(body)
const newOrder = (quantity = 2, listingId = listing.id) => post('', buyer, { listingId, quantity })

describe('criar pedido no site (POST /orders)', () => {
  it('RN-PED-01, 02: cria Pendente com preço, total e taxa congelados, sem mexer no estoque', async () => {
    const res = await newOrder(2)
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      status: 'pending',
      negotiation: 'site_payment',
      unitPriceInCents: 4500,
      feeInCents: 0,
      totalInCents: 9000,
      quantity: 2,
    })
    expect(res.body.data.number).toMatch(/^UNI-\d{4}-\d{4}$/)
    expect((await testDb.listing.findUniqueOrThrow({ where: { id: listing.id } })).quantity).toBe(3)
  })

  it('RN-PED-10: novo clique reaproveita o pedido aberto e atualiza a quantidade', async () => {
    const first = await newOrder(1)
    const second = await newOrder(3)
    expect(second.status).toBe(200)
    expect(second.body.data.id).toBe(first.body.data.id)
    expect(second.body.data.totalInCents).toBe(13500)
    expect(await testDb.order.count()).toBe(1)
  })

  it('RN-PED-10: dois cliques ao mesmo tempo criam um único pedido', async () => {
    const results = await Promise.all([newOrder(1), newOrder(1)])
    expect(results.map((r) => r.status).sort()).toEqual([200, 201])
    expect(await testDb.order.count()).toBe(1)
  })

  it('RN-ANU-10: dono não pede o próprio anúncio (403 OWN_LISTING)', async () => {
    const res = await post('', seller, { listingId: listing.id, quantity: 1 })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('OWN_LISTING')
  })

  it('RN §3: admin não faz pedido', async () => {
    const admin = await createUser({ role: 'admin' })
    const res = await post(
      '',
      { id: admin.id, role: 'admin' },
      { listingId: listing.id, quantity: 1 },
    )
    expect(res.status).toBe(403)
  })

  it('RN-EST-02: quantidade acima do estoque = 409 OUT_OF_STOCK', async () => {
    const res = await newOrder(4)
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('OUT_OF_STOCK')
  })

  it('anúncio pausado = 409 LISTING_UNAVAILABLE; excluído ou inexistente = 404', async () => {
    const paused = await createListing(seller.id, { status: 'pausado' })
    expect((await newOrder(1, paused.id)).body.error.code).toBe('LISTING_UNAVAILABLE')
    const deleted = await createListing(seller.id, { deletedAt: new Date() })
    expect((await newOrder(1, deleted.id)).status).toBe(404)
    expect((await newOrder(1, 99999)).status).toBe(404)
  })

  it('exige login e valida o corpo', async () => {
    expect((await request(app).post('/api/v1/orders').send({})).status).toBe(401)
    expect((await post('', buyer, { listingId: listing.id, quantity: 0 })).status).toBe(400)
  })
})

describe('contato por WhatsApp (POST /orders/contact)', () => {
  it('RN-PED-05: cria Em negociação, sem descontar estoque, e conta o contato', async () => {
    const res = await post('/contact', buyer, { listingId: listing.id, quantity: 2 })
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      status: 'negotiating',
      negotiation: 'whatsapp',
      paymentMethod: 'on_delivery',
    })
    const after = await testDb.listing.findUniqueOrThrow({ where: { id: listing.id } })
    expect(after.quantity).toBe(3)
    expect(after.contacts).toBe(1)
    await post('/contact', buyer, { listingId: listing.id, quantity: 1 })
    expect((await testDb.listing.findUniqueOrThrow({ where: { id: listing.id } })).contacts).toBe(1)
  })
})

describe('leitura', () => {
  it('RN-PED-06, 07: meus pedidos (mais recente primeiro) e pedidos recebidos', async () => {
    const other = await createListing(seller.id)
    await newOrder(1)
    await newOrder(1, other.id)
    const mine = await request(app).get('/api/v1/orders/mine').set(auth(buyer))
    expect(mine.body.data.map((o: { listingId: number }) => o.listingId)).toEqual([
      other.id,
      listing.id,
    ])
    const received = await request(app).get('/api/v1/orders/received').set(auth(seller))
    expect(received.body.data).toHaveLength(2)
    const filtered = await request(app)
      .get(`/api/v1/orders/received?listingId=${listing.id}`)
      .set(auth(seller))
    expect(filtered.body.data).toHaveLength(1)
  })

  it('pedido de terceiros = 403; inexistente = 404; comprador vê o WhatsApp do vendedor', async () => {
    const created = (await newOrder(1)).body.data
    const stranger = await createUser()
    expect(
      (await request(app).get(`/api/v1/orders/${created.id}`).set(auth(stranger))).status,
    ).toBe(403)
    expect((await request(app).get('/api/v1/orders/99999').set(auth(buyer))).status).toBe(404)
    const own = await request(app).get(`/api/v1/orders/${created.id}`).set(auth(buyer))
    expect(own.body.data.seller.whatsapp).toBe(listing.whatsapp)
  })

  it('RN-PAG-12: pedido Pendente com mais de 30 minutos é cancelado ao ser lido', async () => {
    const created = (await newOrder(1)).body.data
    await testDb.order.update({
      where: { id: created.id },
      data: { createdAt: new Date(Date.now() - 31 * 60_000) },
    })
    const res = await request(app).get(`/api/v1/orders/${created.id}`).set(auth(buyer))
    expect(res.body.data).toMatchObject({ status: 'cancelled', cancelReason: 'expired' })
  })
})

describe('concluir venda do WhatsApp (POST /orders/:id/complete)', () => {
  const contact = async (quantity = 1) =>
    (await post('/contact', buyer, { listingId: listing.id, quantity })).body.data

  it('RN-EST-03: vendedor conclui e o estoque é descontado', async () => {
    const order = await contact(2)
    const res = await post(`/${order.id}/complete`, seller)
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('completed')
    expect((await testDb.listing.findUniqueOrThrow({ where: { id: listing.id } })).quantity).toBe(1)
  })

  it('RN-EST-06: zerar o estoque marca o anúncio como Vendido na mesma transação', async () => {
    const order = await contact(3)
    await post(`/${order.id}/complete`, seller)
    const after = await testDb.listing.findUniqueOrThrow({ where: { id: listing.id } })
    expect(after).toMatchObject({ quantity: 0, status: 'vendido' })
    expect(after.soldAt).not.toBeNull()
  })

  it('RN-PED-13: sem estoque suficiente = 409 OUT_OF_STOCK e o pedido segue Em negociação', async () => {
    const order = await contact(3)
    await testDb.listing.update({ where: { id: listing.id }, data: { quantity: 1 } })
    const res = await post(`/${order.id}/complete`, seller)
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('OUT_OF_STOCK')
    expect((await testDb.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(
      'em_negociacao',
    )
  })

  it('duas conclusões simultâneas da última unidade: só uma conclui', async () => {
    const last = await createListing(seller.id, { quantity: 1 })
    const other = await createUser()
    const a = (await post('/contact', buyer, { listingId: last.id, quantity: 1 })).body.data
    const b = (await post('/contact', other, { listingId: last.id, quantity: 1 })).body.data
    const results = await Promise.all([
      post(`/${a.id}/complete`, seller),
      post(`/${b.id}/complete`, seller),
    ])
    expect(results.map((r) => r.status).sort()).toEqual([200, 409])
    expect((await testDb.listing.findUniqueOrThrow({ where: { id: last.id } })).quantity).toBe(0)
  })

  it('comprador não conclui; concluir duas vezes = 409 INVALID_STATE', async () => {
    const order = await contact()
    expect((await post(`/${order.id}/complete`, buyer)).status).toBe(403)
    await post(`/${order.id}/complete`, seller)
    const again = await post(`/${order.id}/complete`, seller)
    expect(again.status).toBe(409)
    expect(again.body.error.code).toBe('INVALID_STATE')
  })
})

describe('retirada de pedido pago', () => {
  const paid = () =>
    createOrder(listing.id, buyer.id, seller.id, {
      negotiationType: 'pagamento_site',
      status: 'pago',
    })

  it('RN-PED-08: vendedor combina a retirada e comprador confirma o recebimento', async () => {
    const order = await paid()
    expect((await post(`/${order.id}/confirm-receipt`, buyer)).status).toBe(409) // antes de combinar
    const arranged = await post(`/${order.id}/arrange-pickup`, seller)
    expect(arranged.body.data.status).toBe('pickup_arranged')
    const done = await post(`/${order.id}/confirm-receipt`, buyer)
    expect(done.body.data.status).toBe('completed')
  })

  it('vendedor não confirma o recebimento e comprador não combina a retirada', async () => {
    const order = await paid()
    expect((await post(`/${order.id}/arrange-pickup`, buyer)).status).toBe(403)
    await post(`/${order.id}/arrange-pickup`, seller)
    expect((await post(`/${order.id}/confirm-receipt`, seller)).status).toBe(403)
  })

  it('RN-PED-12: Pago e Retirada combinada não se cancelam por /cancel', async () => {
    const order = await paid()
    expect((await post(`/${order.id}/cancel`, buyer)).status).toBe(409)
    await post(`/${order.id}/arrange-pickup`, seller)
    expect((await post(`/${order.id}/cancel`, buyer)).status).toBe(409)
    expect((await post(`/${order.id}/cancel`, seller)).status).toBe(409)
  })
})

describe('cancelar (POST /orders/:id/cancel)', () => {
  it('RN-PED-12: comprador cancela Pendente e Em negociação; vendedor encerra só Em negociação', async () => {
    const pending = (await newOrder(1)).body.data
    expect((await post(`/${pending.id}/cancel`, seller)).status).toBe(409)
    expect((await post(`/${pending.id}/cancel`, buyer)).body.data.status).toBe('cancelled')

    const talk = (await post('/contact', buyer, { listingId: listing.id, quantity: 1 })).body.data
    expect((await post(`/${talk.id}/cancel`, seller)).body.data.status).toBe('cancelled')
  })

  it('cancelar duas vezes = 409', async () => {
    const order = (await newOrder(1)).body.data
    await post(`/${order.id}/cancel`, buyer)
    expect((await post(`/${order.id}/cancel`, buyer)).status).toBe(409)
  })
})

describe('pedido vencido ainda não varrido pelo job (RN-PAG-12)', () => {
  const age = (id: number) =>
    testDb.order.update({
      where: { id },
      data: { createdAt: new Date(Date.now() - 31 * 60_000) },
    })

  it('RN-PAG-12: novo clique com o Pendente vencido cancela o antigo e cria um pedido novo', async () => {
    const first = await newOrder(1)
    await age(first.body.data.id)
    const second = await newOrder(1)
    expect(second.status).toBe(201)
    expect(second.body.data.id).not.toBe(first.body.data.id)
    expect(second.body.data.status).toBe('pending')
    expect(
      await testDb.order.findUniqueOrThrow({ where: { id: first.body.data.id } }),
    ).toMatchObject({
      status: 'cancelado',
      cancelReason: 'vencido',
    })
  })

  it('RN-PAG-12: o vencido com Pix pendente também dá lugar a um pedido novo (sem 409)', async () => {
    const first = await newOrder(1)
    const pix = await request(app)
      .post('/api/v1/payments/pix')
      .set(auth(buyer))
      .send({ orderId: first.body.data.id })
    expect(pix.status).toBe(201)
    await age(first.body.data.id)
    const second = await newOrder(2)
    expect(second.status).toBe(201)
    expect(second.body.data.quantity).toBe(2)
    await flushBackground()
    expect(gateway.calls.cancels).toHaveLength(1) // a cobrança do pedido vencido foi cancelada
  })

  it('GET /orders/mine não espera o cancelamento no gateway (vai para segundo plano)', async () => {
    const first = await newOrder(1)
    await request(app)
      .post('/api/v1/payments/pix')
      .set(auth(buyer))
      .send({ orderId: first.body.data.id })
    await age(first.body.data.id)
    let release!: () => void
    const original = gateway.cancelPayment.bind(gateway)
    gateway.cancelPayment = (id) =>
      new Promise<void>((resolve) => {
        release = () => void original(id).then(resolve)
      })
    const res = await request(app).get('/api/v1/orders/mine').set(auth(buyer)) // não pode travar
    gateway.cancelPayment = original
    expect(res.status).toBe(200)
    expect(res.body.data[0].status).toBe('cancelled')
    release()
    await flushBackground()
  })
})

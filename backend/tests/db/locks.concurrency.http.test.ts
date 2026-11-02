import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { flushBackground } from '../../src/shared/utils/background'
import { buildDbApp } from '../helpers/db-app'
import { createListing, createOrder, createUser, resetDb, testDb } from '../helpers/db'

// Ordem das travas (usuario -> pedido -> anuncio): liquidação, conclusão, exclusão e suspensão
// disputando as mesmas linhas, 20 vezes cada. Esperado: nenhum 500 (deadlock 40P01 viraria 500) e
// as invariantes do estoque e do pedido.
const ROUNDS = 20
const { app, auth, gateway } = buildDbApp()

let admin: Awaited<ReturnType<typeof createUser>>
beforeEach(async () => {
  await resetDb()
  gateway.reset()
  admin = await createUser({ role: 'admin' })
})
const adminAuth = () => auth({ id: admin.id, role: 'admin' })

// Pedido de pagamento no site com Pix aprovado no gateway, pronto para o webhook.
async function pendingPixOrder() {
  const seller = await createUser()
  const buyer = await createUser()
  const listing = await createListing(seller.id, { price: '45.00', quantity: 1 })
  const order = (
    await request(app)
      .post('/api/v1/orders')
      .set(auth(buyer))
      .send({ listingId: listing.id, quantity: 1 })
  ).body.data as { id: number }
  await request(app).post('/api/v1/payments/pix').set(auth(buyer)).send({ orderId: order.id })
  const pay = await testDb.payment.findFirstOrThrow({ where: { orderId: order.id } })
  gateway.setStatus(pay.gatewayTxId!, 'approved')
  return { seller, buyer, listing, order, pay }
}
const webhook = (txId: string) => {
  const signed = gateway.signedWebhook(txId)
  return request(app)
    .post(`/api/v1/payments/webhook?data.id=${txId}&type=payment`)
    .set(signed.headers as Record<string, string>)
    .send({ type: 'payment', data: { id: txId } })
}
const orderOf = (id: number) => testDb.order.findUniqueOrThrow({ where: { id } })
const payOf = (id: number) => testDb.payment.findUniqueOrThrow({ where: { id } })
const listingOf = (id: number) => testDb.listing.findUniqueOrThrow({ where: { id } })

// Pago ou cancelado com estorno: nunca os dois, nunca nenhum dos dois.
async function expectSettled(ctx: {
  order: { id: number }
  pay: { id: number }
  listing: { id: number }
}) {
  const order = await orderOf(ctx.order.id)
  const pay = await payOf(ctx.pay.id)
  const listing = await listingOf(ctx.listing.id)
  expect(listing.quantity).toBeGreaterThanOrEqual(0)
  if (order.status === 'pago') {
    expect(pay.status).toBe('aprovado')
    expect(listing.quantity).toBe(0)
  } else {
    expect(order.status).toBe('cancelado')
    expect(['estorno_pendente', 'estornado']).toContain(pay.status)
    expect(listing.quantity).toBe(1) // nada foi descontado
  }
  return order.status
}

describe(`travas sob concorrência (${ROUNDS} rodadas)`, () => {
  it('liquidação aprovada x exclusão do anúncio pelo admin', async () => {
    for (let i = 0; i < ROUNDS; i++) {
      const ctx = await pendingPixOrder()
      const [hook, del] = await Promise.all([
        webhook(ctx.pay.gatewayTxId!),
        request(app).delete(`/api/v1/admin/listings/${ctx.listing.id}`).set(adminAuth()),
      ])
      expect(hook.status).toBeLessThan(500)
      expect([204, 409]).toContain(del.status)
      const status = await expectSettled(ctx)
      // Exclusão bloqueada (409) só se o pedido ficou pago; excluída (204) nunca deixa pedido pago.
      if (del.status === 409) expect(status).toBe('pago')
      if (del.status === 204) expect(status).toBe('cancelado')
    }
    await flushBackground()
  })

  it('liquidação aprovada x anonimização do vendedor', async () => {
    for (let i = 0; i < ROUNDS; i++) {
      const ctx = await pendingPixOrder()
      const [hook, del] = await Promise.all([
        webhook(ctx.pay.gatewayTxId!),
        request(app)
          .delete('/api/v1/users/me')
          .set(auth(ctx.seller))
          .send({ confirmation: 'EXCLUIR' }),
      ])
      expect(hook.status).toBeLessThan(500)
      expect([204, 409]).toContain(del.status)
      const status = await expectSettled(ctx)
      if (del.status === 409) expect(status).toBe('pago')
      if (del.status === 204) expect(status).toBe('cancelado')
    }
    await flushBackground()
  })

  it('liquidação aprovada x pausa do anúncio pelo admin', async () => {
    for (let i = 0; i < ROUNDS; i++) {
      const ctx = await pendingPixOrder()
      const [hook, pause] = await Promise.all([
        webhook(ctx.pay.gatewayTxId!),
        request(app)
          .patch(`/api/v1/admin/listings/${ctx.listing.id}`)
          .set(adminAuth())
          .send({ status: 'paused' }),
      ])
      expect(hook.status).toBeLessThan(500)
      expect(pause.status).toBeLessThan(500)
      await expectSettled(ctx)
    }
    await flushBackground()
  })

  it('conclusão da negociação x exclusão do anúncio pelo admin', async () => {
    for (let i = 0; i < ROUNDS; i++) {
      const seller = await createUser()
      const buyer = await createUser()
      const listing = await createListing(seller.id, { quantity: 1 })
      const order = await createOrder(listing.id, buyer.id, seller.id, {
        status: 'em_negociacao',
      })
      const [done, del] = await Promise.all([
        request(app).post(`/api/v1/orders/${order.id}/complete`).set(auth(seller)),
        request(app).delete(`/api/v1/admin/listings/${listing.id}`).set(adminAuth()),
      ])
      expect(done.status).toBeLessThan(500)
      expect(del.status).toBeLessThan(500)
      const after = await orderOf(order.id)
      expect(['concluido', 'cancelado']).toContain(after.status)
      // Concluído = estoque descontado uma vez; cancelado = nada descontado.
      const quantity = (await listingOf(listing.id)).quantity
      expect(quantity).toBe(after.status === 'concluido' ? 0 : 1)
    }
  })
})

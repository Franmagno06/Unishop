import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { flushBackground } from '../../src/shared/utils/background'
import { buildDbApp } from '../helpers/db-app'
import { createListing, createUser, resetDb, testDb } from '../helpers/db'

// RN-NOT-03, RN-PER-06: comprador anonimizado com Pix pendente que paga depois recebe o estorno,
// mas nenhum e-mail sai para o endereço `removido_<id>@removido.invalid`.
const { app, auth, gateway, mail } = buildDbApp()

beforeEach(async () => {
  await resetDb()
  gateway.reset()
  mail.refunds.length = 0
})

describe('guarda de destinatário (banco real)', () => {
  it('pagamento tardio de comprador anonimizado estorna, mas não envia e-mail', async () => {
    const seller = await createUser()
    const buyer = await createUser({ email: 'comprador@edu.unifor.br' })
    const listing = await createListing(seller.id, { price: '45.00', quantity: 2 })

    const order = (
      await request(app)
        .post('/api/v1/orders')
        .set(auth(buyer))
        .send({ listingId: listing.id, quantity: 1 })
    ).body.data as { id: number }
    await request(app).post('/api/v1/payments/pix').set(auth(buyer)).send({ orderId: order.id })
    const pay = await testDb.payment.findFirstOrThrow({ where: { orderId: order.id } })

    // O comprador exclui a conta: anonimiza e cancela o pedido Pendente.
    const del = await request(app)
      .delete('/api/v1/users/me')
      .set(auth(buyer))
      .send({ confirmation: 'EXCLUIR' })
    expect(del.status).toBe(204)
    const anon = await testDb.user.findUniqueOrThrow({ where: { id: buyer.id } })
    expect(anon.email.endsWith('@removido.invalid')).toBe(true)

    // O Pix é pago mesmo assim: a liquidação estorna.
    gateway.setStatus(pay.gatewayTxId!, 'approved')
    const signed = gateway.signedWebhook(pay.gatewayTxId!)
    await request(app)
      .post(`/api/v1/payments/webhook?data.id=${pay.gatewayTxId}&type=payment`)
      .set(signed.headers as Record<string, string>)
      .send({ type: 'payment', data: { id: pay.gatewayTxId } })
    await flushBackground()

    const after = await testDb.payment.findUniqueOrThrow({ where: { id: pay.id } })
    expect(after.status).toBe('estornado')
    expect(mail.refunds).toHaveLength(0)
  })
})

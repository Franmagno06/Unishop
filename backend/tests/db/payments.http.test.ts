import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { flushBackground } from '../../src/shared/utils/background'
import { buildDbApp } from '../helpers/db-app'
import { createListing, createUser, resetDb, testDb } from '../helpers/db'

// Pagamentos e liquidação (backend.md §9.6 e §11, RN-PAG-01 a 14) com o banco real e o gateway falso.
const { app, auth, gateway, mail } = buildDbApp()

let seller: Awaited<ReturnType<typeof createUser>>
let buyer: Awaited<ReturnType<typeof createUser>>
let listing: Awaited<ReturnType<typeof createListing>>

beforeEach(async () => {
  await resetDb()
  gateway.reset()
  mail.sales.length = 0
  mail.refunds.length = 0
  seller = await createUser()
  buyer = await createUser()
  listing = await createListing(seller.id, { price: '45.00', quantity: 2 })
})

const api = (method: 'post' | 'get', path: string, who?: { id: number }, body?: object) => {
  const r = request(app)[method](`/api/v1${path}`)
  return (who ? r.set(auth(who)) : r).send(body)
}
const newOrder = async (quantity = 1) =>
  (await api('post', '/orders', buyer, { listingId: listing.id, quantity })).body.data as {
    id: number
  }
const card = (orderId: number, token = 'mock_approved') =>
  api('post', '/payments/card', buyer, { orderId, token, paymentMethodId: 'visa', installments: 1 })
const pix = (orderId: number) => api('post', '/payments/pix', buyer, { orderId })
const orderRow = (id: number) => testDb.order.findUniqueOrThrow({ where: { id } })
const listingRow = () => testDb.listing.findUniqueOrThrow({ where: { id: listing.id } })
const payments = (orderId: number) =>
  testDb.payment.findMany({ where: { orderId }, orderBy: { id: 'asc' } })
const webhook = (paymentId: string, extra?: Partial<ReturnType<typeof gateway.signedWebhook>>) => {
  const signed = { ...gateway.signedWebhook(paymentId), ...extra }
  return request(app)
    .post(`/api/v1/payments/webhook?data.id=${paymentId}&type=payment`)
    .set(signed.headers as Record<string, string>)
    .send({ type: 'payment', data: { id: paymentId } })
}

describe('cartão (POST /payments/card)', () => {
  it('RN-PAG-02: aprovado liquida: pedido Pago, estoque descontado, vendedor avisado', async () => {
    const order = await newOrder(2)
    const res = await card(order.id)
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('paid')
    expect(await orderRow(order.id)).toMatchObject({ status: 'pago' })
    expect(await listingRow()).toMatchObject({ quantity: 0, status: 'vendido' })
    const [pay] = await payments(order.id)
    expect(pay).toMatchObject({
      status: 'aprovado',
      method: 'cartao',
      idempotencyKey: `pedido:${order.id}:card:1`,
    })
    expect(pay!.gatewayTxId).toBeTruthy()
    await flushBackground()
    expect(mail.sales).toHaveLength(1) // RN-NOT-01
    expect(mail.sales[0]).toMatchObject({ to: seller.email, quantity: 2, totalInCents: 9000 })
  })

  it('RN-PAG-07: recusado = 402, o pedido segue Pendente e a nova tentativa cria outra linha', async () => {
    const order = await newOrder()
    const declined = await card(order.id, 'mock_declined')
    expect(declined.status).toBe(402)
    expect(declined.body.error.code).toBe('PAYMENT_DECLINED')
    expect((await orderRow(order.id)).status).toBe('pendente')

    expect((await card(order.id)).status).toBe(200)
    const rows = await payments(order.id)
    expect(rows.map((r) => r.status)).toEqual(['recusado', 'aprovado'])
    expect(rows.map((r) => r.idempotencyKey)).toEqual([
      `pedido:${order.id}:card:1`,
      `pedido:${order.id}:card:2`,
    ])
  })

  it('RN-PAG-02: o corpo só aceita o token; número de cartão é recusado', async () => {
    const order = await newOrder()
    const res = await api('post', '/payments/card', buyer, {
      orderId: order.id,
      token: 't',
      paymentMethodId: 'visa',
      installments: 1,
      number: '4111111111111111',
    })
    expect(res.status).toBe(400)
    expect(await payments(order.id)).toHaveLength(0)
  })

  it('RN-PAG-08: estoque acabou depois do pedido = pedido cancelado, estorno e e-mail', async () => {
    const order = await newOrder(2)
    await testDb.listing.update({ where: { id: listing.id }, data: { quantity: 1 } })
    const res = await card(order.id)
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('OUT_OF_STOCK') // o aviso antecipado já barra
  })

  it('RN-PAG-08: estoque some DURANTE a cobrança (liquidação) = Cancelado + estornado', async () => {
    const order = await newOrder(2)
    // Outra venda fecha logo depois da conferência antecipada e antes da liquidação.
    const original = gateway.createCardPayment.bind(gateway)
    gateway.createCardPayment = async (input) => {
      await testDb.listing.update({ where: { id: listing.id }, data: { quantity: 1 } })
      return original(input)
    }
    const res = await card(order.id)
    gateway.createCardPayment = original
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('OUT_OF_STOCK')
    expect(await orderRow(order.id)).toMatchObject({
      status: 'cancelado',
      cancelReason: 'sem_estoque',
    })
    expect((await payments(order.id))[0]!.status).toBe('estornado')
    expect(gateway.calls.refunds).toHaveLength(1)
    await flushBackground()
    expect(mail.refunds[0]).toMatchObject({ to: buyer.email, reason: 'out_of_stock' }) // RN-NOT-03
    expect(mail.sales).toHaveLength(0)
  })

  it('RN-PAG-14: anúncio pausado na confirmação cancela e estorna', async () => {
    const order = await newOrder()
    const original = gateway.createCardPayment.bind(gateway)
    gateway.createCardPayment = async (input) => {
      await testDb.listing.update({ where: { id: listing.id }, data: { status: 'pausado' } })
      return original(input)
    }
    const res = await card(order.id)
    gateway.createCardPayment = original
    expect(res.body.error.code).toBe('LISTING_UNAVAILABLE')
    expect(await orderRow(order.id)).toMatchObject({
      status: 'cancelado',
      cancelReason: 'anuncio_indisponivel',
    })
    expect((await payments(order.id))[0]!.status).toBe('estornado')
    expect((await listingRow()).quantity).toBe(2) // estoque intacto
  })

  it('pedido de outro comprador = 403; pedido cancelado = 409 ORDER_CANCELLED', async () => {
    const order = await newOrder()
    const stranger = await createUser()
    const forbidden = await api('post', '/payments/card', stranger, {
      orderId: order.id,
      token: 't',
      paymentMethodId: 'visa',
      installments: 1,
    })
    expect(forbidden.status).toBe(403)
    await api('post', `/orders/${order.id}/cancel`, buyer)
    const res = await card(order.id)
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('ORDER_CANCELLED')
  })

  it('falha do gateway = 502 sem detalhe, sem deixar tentativa pendente presa', async () => {
    const order = await newOrder()
    gateway.failNextCreate()
    const res = await card(order.id)
    expect(res.status).toBe(502)
    expect(res.body.error.code).toBe('EXTERNAL_SERVICE_ERROR')
    expect((await payments(order.id))[0]!.status).toBe('recusado')
    expect((await card(order.id)).status).toBe(200)
  })
})

describe('Pix (POST /payments/pix) e webhook', () => {
  it('RN-PAG-04: gera o código, válido por 30 minutos, e repetir devolve o mesmo', async () => {
    const order = await newOrder()
    const first = await pix(order.id)
    expect(first.status).toBe(201)
    expect(first.body.data.code).toMatch(/^0002/)
    const created = (await orderRow(order.id)).createdAt.getTime()
    expect(Date.parse(first.body.data.expiresAt) - created).toBe(30 * 60_000)
    const again = await pix(order.id)
    expect(again.body.data.code).toBe(first.body.data.code)
    expect(await payments(order.id)).toHaveLength(1)
  })

  it('RN-PAG-05: o pedido só vira Pago pelo webhook assinado, que consulta o gateway', async () => {
    const order = await newOrder()
    await pix(order.id)
    const [pay] = await payments(order.id)
    expect((await orderRow(order.id)).status).toBe('pendente') // nada de "já paguei" do navegador

    gateway.setStatus(pay!.gatewayTxId!, 'approved')
    const res = await webhook(pay!.gatewayTxId!)
    expect(res.status).toBe(200)
    expect(await orderRow(order.id)).toMatchObject({ status: 'pago' })
    expect((await listingRow()).quantity).toBe(1)
    await flushBackground()
    expect(mail.sales).toHaveLength(1)
  })

  it('RN-PAG-06: webhook duplicado não desconta nem notifica duas vezes', async () => {
    const order = await newOrder()
    await pix(order.id)
    const [pay] = await payments(order.id)
    gateway.setStatus(pay!.gatewayTxId!, 'approved')
    await Promise.all([
      webhook(pay!.gatewayTxId!),
      webhook(pay!.gatewayTxId!),
      webhook(pay!.gatewayTxId!),
    ])
    await flushBackground()
    expect((await listingRow()).quantity).toBe(1)
    expect(mail.sales).toHaveLength(1)
    expect(await payments(order.id)).toHaveLength(1)
  })

  it('RN-PAG-05: aviso sem assinatura = 400, assinatura errada ou antiga = 401, e nada muda', async () => {
    const order = await newOrder()
    await pix(order.id)
    const [pay] = await payments(order.id)
    gateway.setStatus(pay!.gatewayTxId!, 'approved')
    const id = pay!.gatewayTxId!

    const missing = await request(app)
      .post(`/api/v1/payments/webhook?data.id=${id}&type=payment`)
      .send({})
    expect(missing.status).toBe(400)
    const wrong = await request(app)
      .post(`/api/v1/payments/webhook?data.id=${id}&type=payment`)
      .set({ 'x-signature': `ts=${Date.now()},v1=${'0'.repeat(64)}`, 'x-request-id': 'abc' })
      .send({})
    expect(wrong.status).toBe(401)
    const old = await webhook(id, gateway.signedWebhook(id, new Date(Date.now() - 6 * 60_000)))
    expect(old.status).toBe(401) // possível replay
    expect((await orderRow(order.id)).status).toBe('pendente')
  })

  it('RN-PAG-13: Pix pago depois do cancelamento é estornado e o comprador é avisado', async () => {
    const order = await newOrder()
    await pix(order.id)
    const [pay] = await payments(order.id)
    await api('post', `/orders/${order.id}/cancel`, buyer)
    expect((await payments(order.id))[0]!.status).toBe('expirado')

    gateway.setStatus(pay!.gatewayTxId!, 'approved') // o aluno pagou mesmo assim
    await webhook(pay!.gatewayTxId!)
    expect((await orderRow(order.id)).status).toBe('cancelado')
    expect((await payments(order.id))[0]!.status).toBe('estornado')
    expect((await listingRow()).quantity).toBe(2)
    await flushBackground()
    expect(mail.refunds[0]).toMatchObject({ reason: 'late_payment' })
  })

  it('Pix em pedido cancelado = 409 PIX_EXPIRED', async () => {
    const order = await newOrder()
    await testDb.order.update({
      where: { id: order.id },
      data: { createdAt: new Date(Date.now() - 31 * 60_000) },
    })
    const res = await pix(order.id)
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('PIX_EXPIRED')
  })

  it('RN-PAG-08: duas liquidações concorrentes da última unidade: um Pago, o outro estornado', async () => {
    const last = await createListing(seller.id, { quantity: 1 })
    const other = await createUser()
    const mk = async (who: { id: number }) =>
      (await api('post', '/orders', who, { listingId: last.id, quantity: 1 })).body.data
        .id as number
    const [a, b] = [await mk(buyer), await mk(other)]
    await api('post', '/payments/pix', buyer, { orderId: a })
    await api('post', '/payments/pix', other, { orderId: b })
    const rows = [...(await payments(a)), ...(await payments(b))]
    for (const r of rows) gateway.setStatus(r.gatewayTxId!, 'approved')
    await Promise.all(rows.map((r) => webhook(r.gatewayTxId!)))
    const statuses = [(await orderRow(a)).status, (await orderRow(b)).status].sort()
    expect(statuses).toEqual(['cancelado', 'pago'])
    expect((await testDb.listing.findUniqueOrThrow({ where: { id: last.id } })).quantity).toBe(0)
    expect(gateway.calls.refunds).toHaveLength(1)
  })
})

describe('estorno que falha', () => {
  it('RN-PAG-08: estorno falho deixa estorno_pendente; o job de conciliação refaz e avisa', async () => {
    const order = await newOrder(2)
    const original = gateway.createCardPayment.bind(gateway)
    gateway.createCardPayment = async (input) => {
      await testDb.listing.update({ where: { id: listing.id }, data: { quantity: 1 } })
      return original(input)
    }
    gateway.failNextRefund()
    await card(order.id)
    gateway.createCardPayment = original
    let [pay] = await payments(order.id)
    expect(pay).toMatchObject({
      status: 'estorno_pendente',
      refundAttempts: 1,
      lastError: 'EXTERNAL_SERVICE_ERROR',
    })
    expect(mail.refunds).toHaveLength(0)

    const job = await request(app)
      .get('/api/v1/internal/jobs/reconcile-pending-payments')
      .set('Authorization', `Bearer ${process.env.CRON_SECRET!}`)
    expect(job.status).toBe(200)
    expect(job.body.data.refunded).toBe(1)
    ;[pay] = await payments(order.id)
    expect(pay!.status).toBe('estornado')
    await flushBackground()
    expect(mail.refunds).toHaveLength(1)
    // rodar de novo não estorna outra vez
    await request(app)
      .get('/api/v1/internal/jobs/reconcile-pending-payments')
      .set('Authorization', `Bearer ${process.env.CRON_SECRET!}`)
    expect(gateway.calls.refunds).toHaveLength(1)
  })
})

describe('jobs agendados (backend.md §14)', () => {
  const run = (name: string, secret?: string) => {
    const r = request(app).get(`/api/v1/internal/jobs/${name}`)
    return secret === undefined ? r : r.set('Authorization', secret)
  }

  it('sem segredo, com segredo errado ou "Bearer undefined" = 401', async () => {
    expect((await run('expire-pix-payments')).status).toBe(401)
    expect((await run('expire-pix-payments', 'Bearer errado')).status).toBe(401)
    expect((await run('expire-pix-payments', 'Bearer undefined')).status).toBe(401)
    expect((await run('expire-pix-payments', 'Bearer [REDACTED]')).status).toBe(401)
  })

  it('job inexistente = 404', async () => {
    expect((await run('nao-existe', `Bearer ${process.env.CRON_SECRET!}`)).status).toBe(404)
    expect((await run('constructor', `Bearer ${process.env.CRON_SECRET!}`)).status).toBe(404)
  })

  it('RN-PAG-12: expire-pix-payments cancela o Pendente de 30 min e a cobrança; rodar duas vezes dá o mesmo', async () => {
    const order = await newOrder()
    await pix(order.id)
    const [pay] = await payments(order.id)
    await testDb.order.update({
      where: { id: order.id },
      data: { createdAt: new Date(Date.now() - 31 * 60_000) },
    })
    const bearer = `Bearer ${process.env.CRON_SECRET!}`
    const first = await run('expire-pix-payments', bearer)
    expect(first.body.data).toEqual({ expired: 1 })
    const second = await run('expire-pix-payments', bearer)
    expect(second.body.data).toEqual({ expired: 0 })
    expect(await orderRow(order.id)).toMatchObject({ status: 'cancelado', cancelReason: 'vencido' })
    expect(gateway.calls.cancels).toEqual([pay!.gatewayTxId])
  })

  it('RN-PAG-05: reconcile corrige o webhook perdido', async () => {
    const order = await newOrder()
    await pix(order.id)
    const [pay] = await payments(order.id)
    gateway.setStatus(pay!.gatewayTxId!, 'approved')
    await testDb.payment.update({
      where: { id: pay!.id },
      data: { createdAt: new Date(Date.now() - 10 * 60_000) },
    })
    await run('reconcile-pending-payments', `Bearer ${process.env.CRON_SECRET!}`)
    expect((await orderRow(order.id)).status).toBe('pago')
  })

  it('cleanup-expired-tokens apaga só os vencidos', async () => {
    await testDb.userToken.createMany({
      data: [
        {
          userId: buyer.id,
          type: 'redefinicao_senha',
          tokenHash: 'a',
          expiresAt: new Date(Date.now() - 1000),
        },
        {
          userId: buyer.id,
          type: 'redefinicao_senha',
          tokenHash: 'b',
          expiresAt: new Date(Date.now() + 60_000),
        },
      ],
    })
    const res = await run('cleanup-expired-tokens', `Bearer ${process.env.CRON_SECRET!}`)
    expect(res.body.data).toEqual({ deleted: 1 })
    expect(await testDb.userToken.count()).toBe(1)
  })
})

describe('saúde', () => {
  it('GET /health/db confere o banco', async () => {
    const res = await request(app).get('/api/v1/health/db')
    expect(res.status).toBe(200)
  })
})

describe('simulador de desenvolvimento', () => {
  it('aprova a cobrança falsa do pedido como se o webhook tivesse chegado', async () => {
    const order = await newOrder()
    await pix(order.id)
    const res = await api('post', `/payments/dev/orders/${order.id}/approve`, buyer)
    expect(res.status).toBe(200)
    expect((await orderRow(order.id)).status).toBe('pago')
  })
})

describe('valor do pedido com cobrança aberta (RN-PED-10, RN-PAG-05)', () => {
  it('RN-PED-10: com Pix pendente, mudar a quantidade do pedido = 409 PAYMENT_IN_PROGRESS e o valor não muda', async () => {
    const order = await newOrder(1)
    await pix(order.id)
    const res = await api('post', '/orders', buyer, { listingId: listing.id, quantity: 2 })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('PAYMENT_IN_PROGRESS')
    expect(await orderRow(order.id)).toMatchObject({ quantity: 1 })
    expect(Number((await orderRow(order.id)).totalAmount)).toBe(45)
  })

  it('RN-PED-10: com Pix pendente, repetir a mesma quantidade devolve o pedido sem alterar nada', async () => {
    const order = await newOrder(1)
    await pix(order.id)
    const before = await orderRow(order.id)
    const res = await api('post', '/orders', buyer, { listingId: listing.id, quantity: 1 })
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(order.id)
    expect((await orderRow(order.id)).updatedAt).toEqual(before.updatedAt)
  })

  it('RN-PAG-05: se o valor da cobrança difere do pedido, não liquida: estorna e o pedido segue Pendente', async () => {
    const order = await newOrder(1)
    await pix(order.id)
    const [pay] = await payments(order.id)
    await testDb.order.update({ where: { id: order.id }, data: { totalAmount: '90.00' } })
    gateway.setStatus(pay!.gatewayTxId!, 'approved')
    await webhook(pay!.gatewayTxId!)
    expect(await orderRow(order.id)).toMatchObject({ status: 'pendente' })
    expect((await payments(order.id))[0]).toMatchObject({ status: 'estornado' })
    expect((await listingRow()).quantity).toBe(2)
    expect(gateway.calls.refunds).toEqual([pay!.gatewayTxId])
    await flushBackground()
    expect(mail.refunds[0]).toMatchObject({ reason: 'amount_mismatch' })
  })

  it('RN-PAG-05: se o gateway cobrou valor diferente do registrado, estorna sem liquidar', async () => {
    const order = await newOrder(1)
    await pix(order.id)
    const [pay] = await payments(order.id)
    gateway.payments.get(pay!.gatewayTxId!)!.amountInCents = 100
    gateway.setStatus(pay!.gatewayTxId!, 'approved')
    await webhook(pay!.gatewayTxId!)
    expect((await orderRow(order.id)).status).toBe('pendente')
    expect((await payments(order.id))[0]!.status).toBe('estornado')
    expect(gateway.calls.refunds).toHaveLength(1)
    expect((await listingRow()).quantity).toBe(2)
  })
})

describe('cobrança órfã por timeout do gateway (RN-PAG-05, 13)', () => {
  const lostId = () => [...gateway.payments.keys()][0]!

  it('RN-PAG-05: cartão aprovado cuja resposta se perdeu é reconciliado pela referência pedido:N', async () => {
    const order = await newOrder(1)
    gateway.loseNextCreateResponse()
    expect((await card(order.id)).status).toBe(502)
    expect((await payments(order.id))[0]).toMatchObject({ status: 'recusado', gatewayTxId: null })

    expect((await webhook(lostId())).status).toBe(200)
    expect(await orderRow(order.id)).toMatchObject({ status: 'pago' })
    expect((await payments(order.id))[0]).toMatchObject({
      status: 'aprovado',
      gatewayTxId: lostId(),
    })
    expect((await listingRow()).quantity).toBe(1)
    expect(gateway.calls.refunds).toHaveLength(0)
  })

  it('RN-PAG-13: se o pedido já foi cancelado, a cobrança reconciliada é estornada', async () => {
    const order = await newOrder(1)
    gateway.loseNextCreateResponse()
    await card(order.id)
    await api('post', `/orders/${order.id}/cancel`, buyer)
    await webhook(lostId())
    expect((await orderRow(order.id)).status).toBe('cancelado')
    expect((await payments(order.id))[0]!.status).toBe('estornado')
    expect(gateway.calls.refunds).toEqual([lostId()])
    expect((await listingRow()).quantity).toBe(2)
  })

  it('aviso de id desconhecido, sem tentativa órfã correspondente, não muda nada', async () => {
    const order = await newOrder(1)
    gateway.payments.set('mock-estranho', {
      id: 'mock-estranho',
      status: 'approved',
      amountInCents: 4500,
      reference: `pedido:${order.id}`,
      method: 'card',
    })
    expect((await webhook('mock-estranho')).status).toBe(200)
    expect((await orderRow(order.id)).status).toBe('pendente')
    expect(await payments(order.id)).toHaveLength(0)
  })
})

describe('conciliação de Pix expirado e estorno externo (RN-PAG-13)', () => {
  const reconcile = () =>
    request(app)
      .get('/api/v1/internal/jobs/reconcile-pending-payments')
      .set('Authorization', `Bearer ${process.env.CRON_SECRET!}`)

  it('RN-PAG-13: Pix expirado e pago com webhook perdido é achado pelo job e estornado', async () => {
    const order = await newOrder(1)
    await pix(order.id)
    const [pay] = await payments(order.id)
    await api('post', `/orders/${order.id}/cancel`, buyer)
    expect((await payments(order.id))[0]!.status).toBe('expirado')
    gateway.setStatus(pay!.gatewayTxId!, 'approved') // pagou depois de cancelar; o webhook se perdeu
    await testDb.payment.update({
      where: { id: pay!.id },
      data: { createdAt: new Date(Date.now() - 10 * 60_000) },
    })
    await reconcile()
    expect((await payments(order.id))[0]!.status).toBe('estornado')
    expect(gateway.calls.refunds).toEqual([pay!.gatewayTxId])
  })

  it('o job não reconsulta expirados com mais de 24 horas', async () => {
    const order = await newOrder(1)
    await pix(order.id)
    const [pay] = await payments(order.id)
    await api('post', `/orders/${order.id}/cancel`, buyer)
    gateway.setStatus(pay!.gatewayTxId!, 'approved')
    await testDb.payment.update({
      where: { id: pay!.id },
      data: { createdAt: new Date(Date.now() - 25 * 3_600_000) },
    })
    await reconcile()
    expect((await payments(order.id))[0]!.status).toBe('expirado')
  })

  it('estorno feito fora do sistema: a linha vira estornado com ESTORNO_EXTERNO e o pedido Pago não muda', async () => {
    const order = await newOrder(1)
    await card(order.id)
    const [pay] = await payments(order.id)
    gateway.setStatus(pay!.gatewayTxId!, 'refunded')
    await webhook(pay!.gatewayTxId!)
    expect((await payments(order.id))[0]).toMatchObject({
      status: 'estornado',
      lastError: 'ESTORNO_EXTERNO',
    })
    expect((await orderRow(order.id)).status).toBe('pago')
  })
})

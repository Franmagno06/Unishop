import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { buildPaymentGateway } from '../../src/shared/providers/payment'
import { createMockPaymentGateway } from '../../src/shared/providers/payment/mock.provider'
import { verifyWebhookSignature } from '../../src/shared/providers/payment/webhook-signature'

const SECRET = 'segredo-de-teste'
const NOW = new Date('2026-11-01T12:00:00Z')

function sign(dataId: string, requestId: string, ts: number, secret = SECRET) {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`
  const v1 = createHmac('sha256', secret).update(manifest).digest('hex')
  return { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId }
}
const verify = (headers: Record<string, string>, query: Record<string, unknown>) =>
  verifyWebhookSignature({ headers, query, secret: SECRET, now: NOW })

describe('assinatura do webhook (api.md §5.6)', () => {
  const query = { 'data.id': 'ABC123', type: 'payment' }

  it('aceita a assinatura correta (id em minúsculas no manifesto) e devolve o id do pagamento', () => {
    expect(verify(sign('ABC123', 'req-1', NOW.getTime()), query)).toEqual({ paymentId: 'ABC123' })
  })

  it('aviso de outro tipo é aceito, mas sem pagamento para processar', () => {
    const q = { 'data.id': '9', type: 'merchant_order' }
    expect(verify(sign('9', 'r', NOW.getTime()), q)).toEqual({ paymentId: null })
  })

  it('sem cabeçalhos = 400', () => {
    expect(() => verify({}, query)).toThrowError(expect.objectContaining({ status: 400 }))
  })

  it('assinatura errada, segredo errado ou id diferente = 401', () => {
    const bad = sign('ABC123', 'req-1', NOW.getTime(), 'outro-segredo')
    expect(() => verify(bad, query)).toThrowError(expect.objectContaining({ status: 401 }))
    expect(() => verify(sign('OUTRO', 'req-1', NOW.getTime()), query)).toThrowError(
      expect.objectContaining({ status: 401 }),
    )
    expect(() =>
      verify({ 'x-signature': `ts=${NOW.getTime()},v1=xyz`, 'x-request-id': 'r' }, query),
    ).toThrowError(expect.objectContaining({ status: 401 }))
  })

  it('ts fora da janela de 5 minutos (replay) = 401, nos dois sentidos', () => {
    const old = NOW.getTime() - 5 * 60_000 - 1
    expect(() => verify(sign('ABC123', 'r', old), query)).toThrowError(
      expect.objectContaining({ status: 401 }),
    )
    const future = NOW.getTime() + 5 * 60_000 + 1
    expect(() => verify(sign('ABC123', 'r', future), query)).toThrowError(
      expect.objectContaining({ status: 401 }),
    )
    expect(verify(sign('ABC123', 'r', NOW.getTime() - 4 * 60_000), query).paymentId).toBe('ABC123')
  })

  it('aceita `ts` em segundos, como o Mercado Pago manda, e mantém a janela de 5 minutos', () => {
    const seconds = (ms: number) => Math.floor(ms / 1000)
    expect(verify(sign('ABC123', 'r', seconds(NOW.getTime() - 60_000)), query).paymentId).toBe(
      'ABC123',
    )
    expect(() =>
      verify(sign('ABC123', 'r', seconds(NOW.getTime() - 6 * 60_000)), query),
    ).toThrowError(expect.objectContaining({ status: 401 }))
  })
})

describe('gateway falso', () => {
  it('assina avisos que o próprio verifyWebhook aceita', () => {
    const gw = createMockPaymentGateway('s', () => NOW)
    expect(gw.verifyWebhook(gw.signedWebhook('mock-1', NOW))).toEqual({ paymentId: 'mock-1' })
  })

  it('a mesma chave de idempotência devolve a mesma cobrança e o estorno só conta uma vez', async () => {
    const gw = createMockPaymentGateway()
    const req = {
      amountInCents: 100,
      expiresAt: NOW,
      reference: 'pedido:1',
      description: 'x',
      payerEmail: 'a@b.c',
      idempotencyKey: 'k1',
    }
    const a = await gw.createPixPayment(req)
    expect((await gw.createPixPayment(req)).id).toBe(a.id)
    await gw.refundPayment(a.id, 'r1')
    await gw.refundPayment(a.id, 'r1')
    expect(gw.calls.refunds).toHaveLength(1)
  })
})

describe('travas de produção (api.md §6.3)', () => {
  const base = {
    APP_ENV: 'development' as const,
    PAYMENT_DRIVER: 'mock' as const,
    PAYMENT_MODE: 'sandbox' as const,
    MP_ACCESS_TOKEN: undefined,
    MP_WEBHOOK_SECRET: undefined,
    API_PUBLIC_URL: undefined,
  }

  it('o gateway falso funciona em desenvolvimento e teste', () => {
    expect(buildPaymentGateway(base).driver).toBe('mock')
    expect(buildPaymentGateway({ ...base, APP_ENV: 'test' }).driver).toBe('mock')
  })

  it('o gateway falso é proibido em produção', () => {
    expect(() => buildPaymentGateway({ ...base, APP_ENV: 'production' })).toThrow(/mock/)
  })

  it('credencial real (PAYMENT_MODE=production) só com APP_ENV=production', () => {
    for (const APP_ENV of ['development', 'test', 'preview'] as const) {
      expect(() =>
        buildPaymentGateway({
          ...base,
          APP_ENV,
          PAYMENT_MODE: 'production',
          PAYMENT_DRIVER: 'mercadopago',
          MP_ACCESS_TOKEN: 't',
          MP_WEBHOOK_SECRET: 's',
        }),
      ).toThrow(/APP_ENV=production/)
    }
  })

  it('produção com credencial de TESTE é permitida (RN-PAG-10)', () => {
    const gw = buildPaymentGateway({
      ...base,
      APP_ENV: 'production',
      PAYMENT_MODE: 'sandbox',
      PAYMENT_DRIVER: 'mercadopago',
      MP_ACCESS_TOKEN: 'TEST-token',
      MP_WEBHOOK_SECRET: 'segredo',
    })
    expect(gw.driver).toBe('mercadopago')
  })

  it('mercadopago sem as chaves não sobe', () => {
    expect(() => buildPaymentGateway({ ...base, PAYMENT_DRIVER: 'mercadopago' })).toThrow(
      /MP_ACCESS_TOKEN/,
    )
    expect(() =>
      buildPaymentGateway({ ...base, PAYMENT_DRIVER: 'mercadopago', MP_ACCESS_TOKEN: 't' }),
    ).toThrow(/MP_WEBHOOK_SECRET/)
  })
})

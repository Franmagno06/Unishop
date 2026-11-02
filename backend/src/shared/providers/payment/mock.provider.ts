import { createHmac, randomUUID } from 'node:crypto'
import { AppError } from '../../errors/app-error'
import type {
  CardPaymentRequest,
  GatewayPayment,
  GatewayStatus,
  PaymentGateway,
  PixPaymentRequest,
  VerifiedWebhook,
  WebhookInput,
} from './payment.gateway'
import { verifyWebhookSignature } from './webhook-signature'

// Gateway falso para desenvolvimento e teste. Nunca roda em produção (travas em `env.ts` e em
// `buildPaymentGateway`). Funciona sem conta alguma e é controlável nos testes.
//
// Tokens de cartão aceitos (o frontend sem chave pública manda um destes):
//   mock_approved → aprovado    mock_declined → recusado    mock_pending → pendente
export const MOCK_WEBHOOK_SECRET = 'segredo-do-webhook-falso'

type MockRow = GatewayPayment & { method: 'pix' | 'card' }

export type MockPaymentGateway = PaymentGateway & {
  readonly driver: 'mock'
  /** Estado interno, só para testes e para a rota de simulação do ambiente de desenvolvimento. */
  readonly payments: Map<string, MockRow>
  readonly calls: { refunds: string[]; cancels: string[] }
  setStatus(id: string, status: GatewayStatus): void
  /** Faz os próximos estornos falharem (para testar `estorno_pendente`). */
  failNextRefund(times?: number): void
  /** Faz as próximas cobranças falharem com 502. */
  failNextCreate(times?: number): void
  /** A cobrança é criada, mas a resposta se perde (timeout): lança 502 depois de criar. */
  loseNextCreateResponse(times?: number): void
  /** Zera pagamentos, chaves de idempotência, chamadas e falhas programadas (entre testes). */
  reset(): void
  /** Cabeçalhos e query de um aviso assinado, como o Mercado Pago mandaria. */
  signedWebhook(paymentId: string, at?: Date): WebhookInput
}

export function createMockPaymentGateway(
  secret = MOCK_WEBHOOK_SECRET,
  now: () => Date = () => new Date(),
): MockPaymentGateway {
  const payments = new Map<string, MockRow>()
  const calls = { refunds: [] as string[], cancels: [] as string[] }
  const idempotent = new Map<string, string>()
  let refundFailures = 0
  let createFailures = 0
  let lostResponses = 0

  const loseIfAsked = () => {
    if (lostResponses > 0) {
      lostResponses--
      throw new AppError(502, 'EXTERNAL_SERVICE_ERROR', 'Serviço de pagamento indisponível.')
    }
  }

  const failIfAsked = () => {
    if (createFailures > 0) {
      createFailures--
      throw new AppError(502, 'EXTERNAL_SERVICE_ERROR', 'Serviço de pagamento indisponível.')
    }
  }

  return {
    driver: 'mock',
    payments,
    calls,

    async createCardPayment(input: CardPaymentRequest) {
      failIfAsked()
      const known = idempotent.get(input.idempotencyKey)
      if (known) return { ...payments.get(known)! }
      const status: GatewayStatus =
        input.token === 'mock_declined'
          ? 'declined'
          : input.token === 'mock_pending'
            ? 'pending'
            : 'approved'
      const payment: MockRow = {
        id: `mock-${randomUUID()}`,
        status,
        amountInCents: input.amountInCents,
        reference: input.reference,
        method: 'card',
      }
      payments.set(payment.id, payment)
      idempotent.set(input.idempotencyKey, payment.id)
      loseIfAsked()
      return { ...payment }
    },

    async createPixPayment(input: PixPaymentRequest) {
      failIfAsked()
      const known = idempotent.get(input.idempotencyKey)
      if (known) return { ...payments.get(known)! }
      const id = `mock-${randomUUID()}`
      const payment: MockRow = {
        id,
        status: 'pending',
        amountInCents: input.amountInCents,
        reference: input.reference,
        qrCode: `00020126580014br.gov.bcb.pix0136mock-${id}5204000053039865802BR5909UNISHOP6009FORTALEZA6304ABCD`,
        method: 'pix',
      }
      payments.set(id, payment)
      idempotent.set(input.idempotencyKey, id)
      loseIfAsked()
      return { ...payment }
    },

    async getPayment(id) {
      const payment = payments.get(id)
      if (!payment) throw new AppError(502, 'EXTERNAL_SERVICE_ERROR', 'Pagamento não encontrado.')
      return { ...payment }
    },

    verifyWebhook({ headers, query }: WebhookInput): VerifiedWebhook {
      return verifyWebhookSignature({ headers, query, secret, now: now() })
    },

    async cancelPayment(id) {
      calls.cancels.push(id)
      const payment = payments.get(id)
      if (payment && payment.status === 'pending') payment.status = 'cancelled'
    },

    async refundPayment(id, idempotencyKey) {
      if (refundFailures > 0) {
        refundFailures--
        throw new AppError(502, 'EXTERNAL_SERVICE_ERROR', 'Estorno indisponível.')
      }
      if (!idempotent.has(idempotencyKey)) {
        idempotent.set(idempotencyKey, id)
        calls.refunds.push(id)
      }
      const payment = payments.get(id)
      if (payment) payment.status = 'refunded'
    },

    setStatus(id, status) {
      const payment = payments.get(id)
      if (payment) payment.status = status
    },
    failNextRefund(times = 1) {
      refundFailures = times
    },
    loseNextCreateResponse(times = 1) {
      lostResponses = times
    },
    failNextCreate(times = 1) {
      createFailures = times
    },
    reset() {
      payments.clear()
      idempotent.clear()
      calls.refunds.length = 0
      calls.cancels.length = 0
      refundFailures = 0
      createFailures = 0
      lostResponses = 0
    },

    signedWebhook(paymentId, at = now()) {
      const ts = String(at.getTime())
      const requestId = randomUUID()
      const manifest = `id:${paymentId.toLowerCase()};request-id:${requestId};ts:${ts};`
      const v1 = createHmac('sha256', secret).update(manifest).digest('hex')
      return {
        headers: { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId },
        query: { 'data.id': paymentId, type: 'payment' },
      }
    },
  }
}

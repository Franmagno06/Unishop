import { MercadoPagoConfig, Payment, PaymentRefund } from 'mercadopago'
import { AppError } from '../../errors/app-error'
import type {
  CardPaymentRequest,
  GatewayPayment,
  GatewayStatus,
  PaymentGateway,
  PixPaymentRequest,
  WebhookInput,
} from './payment.gateway'
import { verifyWebhookSignature } from './webhook-signature'

// Provider do Mercado Pago pela Payments API (/v1/payments), decisão do ADR-002.
// Só este arquivo conhece o SDK. As credenciais chegam por parâmetro (vêm de `env.ts`) e nunca
// são impressas. Cartão: o backend recebe só o token do SDK do navegador (RN-PAG-02).
export type MercadoPagoOptions = {
  accessToken: string
  webhookSecret: string
  /** URL pública do webhook (`<API_PUBLIC_URL>/api/v1/payments/webhook`). Sem ela o Mercado Pago não avisa. */
  notificationUrl?: string | undefined
  now?: () => Date
}

const TIMEOUT_CREATE_MS = 15_000 // api.md §5.7
const TIMEOUT_QUERY_MS = 10_000

// Status do Mercado Pago → status do Unishop. Nada de `status_detail` cru sai daqui.
function mapStatus(status: string | undefined): GatewayStatus {
  switch (status) {
    case 'approved':
      return 'approved'
    case 'rejected':
      return 'declined'
    case 'refunded':
    case 'charged_back':
      return 'refunded'
    case 'cancelled':
      return 'cancelled'
    default:
      return 'pending' // pending, in_process, authorized, in_mediation
  }
}

// O Mercado Pago pede a expiração com fuso; usamos o de Brasília (-03:00).
function toBrasiliaIso(date: Date): string {
  const shifted = new Date(date.getTime() - 3 * 3_600_000)
  return `${shifted.toISOString().slice(0, -1)}-03:00`
}

// Erro do provedor nunca vai cru ao cliente (api.md §6): vira 502 e só o status vai ao log.
function externalError(err: unknown): AppError {
  const status = (err as { status?: number } | null)?.status
  console.error(`[mercadopago] chamada falhou${status ? ` (HTTP ${status})` : ''}`)
  return new AppError(502, 'EXTERNAL_SERVICE_ERROR', 'Serviço de pagamento indisponível.')
}

export function createMercadoPagoProvider(options: MercadoPagoOptions): PaymentGateway {
  const now = options.now ?? (() => new Date())
  const config = (timeout: number, idempotencyKey?: string) =>
    new MercadoPagoConfig({
      accessToken: options.accessToken,
      options: { timeout, ...(idempotencyKey && { idempotencyKey }) },
    })

  const toGateway = (r: {
    id?: number | string | undefined
    status?: string | undefined
    transaction_amount?: number | undefined
    external_reference?: string | undefined
    point_of_interaction?:
      { transaction_data?: { qr_code?: string | undefined } | undefined } | undefined
  }): GatewayPayment => ({
    id: String(r.id),
    status: mapStatus(r.status),
    amountInCents: Math.round((r.transaction_amount ?? 0) * 100),
    reference: r.external_reference ?? null,
    qrCode: r.point_of_interaction?.transaction_data?.qr_code,
  })

  return {
    driver: 'mercadopago',

    async createCardPayment(input: CardPaymentRequest) {
      try {
        const result = await new Payment(config(TIMEOUT_CREATE_MS, input.idempotencyKey)).create({
          body: {
            transaction_amount: input.amountInCents / 100,
            token: input.token,
            description: input.description,
            installments: input.installments,
            payment_method_id: input.paymentMethodId,
            ...(input.issuerId && { issuer_id: Number(input.issuerId) }),
            payer: { email: input.payerEmail },
            external_reference: input.reference,
            ...(options.notificationUrl && { notification_url: options.notificationUrl }),
          },
          requestOptions: { idempotencyKey: input.idempotencyKey },
        })
        return toGateway(result)
      } catch (err) {
        throw externalError(err)
      }
    },

    async createPixPayment(input: PixPaymentRequest) {
      try {
        const result = await new Payment(config(TIMEOUT_CREATE_MS, input.idempotencyKey)).create({
          body: {
            transaction_amount: input.amountInCents / 100,
            description: input.description,
            payment_method_id: 'pix',
            payer: { email: input.payerEmail },
            date_of_expiration: toBrasiliaIso(input.expiresAt),
            external_reference: input.reference,
            ...(options.notificationUrl && { notification_url: options.notificationUrl }),
          },
          requestOptions: { idempotencyKey: input.idempotencyKey },
        })
        return toGateway(result)
      } catch (err) {
        throw externalError(err)
      }
    },

    async getPayment(id) {
      try {
        return toGateway(await new Payment(config(TIMEOUT_QUERY_MS)).get({ id }))
      } catch (err) {
        throw externalError(err)
      }
    },

    verifyWebhook(input: WebhookInput) {
      return verifyWebhookSignature({ ...input, secret: options.webhookSecret, now: now() })
    },

    async cancelPayment(id) {
      try {
        await new Payment(config(TIMEOUT_QUERY_MS)).cancel({ id })
      } catch (err) {
        throw externalError(err)
      }
    },

    async refundPayment(id, idempotencyKey) {
      try {
        await new PaymentRefund(config(TIMEOUT_CREATE_MS, idempotencyKey)).total({
          payment_id: id,
          requestOptions: { idempotencyKey },
        })
      } catch (err) {
        throw externalError(err)
      }
    },
  }
}

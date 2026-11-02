import { AppError, forbidden, notFound } from '../../shared/errors/app-error'
import type { MailProvider } from '../../shared/providers/mail/mail.provider'
import type { PaymentGateway, WebhookInput } from '../../shared/providers/payment/payment.gateway'
import { runInBackground } from '../../shared/utils/background'
import type { OrdersService } from '../orders/orders.service'
import type { OrderRepository } from '../orders/orders.types'
import { toOrderJson } from '../orders/orders.serializer'
import {
  GATEWAY_ERROR,
  type PaymentRepository,
  type PaymentRow,
  type SettleOutcome,
} from './payments.types'

export const MAX_REFUND_ATTEMPTS = 10 // backend.md §14
const EXPIRED_LOOKBACK_MS = 24 * 60 * 60_000 // por quanto tempo uma cobrança expirada ainda é reconsultada

type Deps = {
  payments: PaymentRepository
  orders: OrderRepository
  ordersService: OrdersService
  gateway: PaymentGateway
  mail: MailProvider
  config: { expirationMinutes: number }
  now?: () => Date
}

export type CardInput = {
  orderId: number
  token: string
  paymentMethodId: string
  issuerId?: string | undefined
  installments: number
}

const orderNumber = (id: number, createdAt: Date) =>
  `UNI-${createdAt.getUTCFullYear()}-${String(id).padStart(4, '0')}`

export function createPaymentsService({
  payments,
  orders,
  ordersService,
  gateway,
  mail,
  config,
  now = () => new Date(),
}: Deps) {
  const ttlMs = config.expirationMinutes * 60_000

  // Tudo que vem depois de uma liquidação. Estorno com `await` (dinheiro); e-mail em segundo plano.
  async function finish(paymentId: number, outcome: SettleOutcome) {
    if (outcome.kind === 'paid') {
      runInBackground(sendSaleMail(paymentId)) // RN-NOT-01
    } else if (outcome.kind === 'refund') {
      await refund(paymentId) // RN-PAG-08, 13, 14
    }
  }

  async function sendSaleMail(paymentId: number) {
    const ctx = await payments.saleMailContext(paymentId)
    if (!ctx) return
    await mail.sendSaleConfirmed({
      to: ctx.sellerEmail,
      name: ctx.sellerName,
      productName: ctx.productName,
      quantity: ctx.quantity,
      totalInCents: ctx.totalInCents,
      orderNumber: orderNumber(ctx.orderId, ctx.createdAt),
    })
  }

  // `estorno_pendente` já está gravado; se a chamada falhar, o job `reconcile-pending-payments` refaz
  // (a chave de idempotência impede estornar duas vezes).
  async function refund(paymentId: number): Promise<boolean> {
    const row = await payments.findById(paymentId)
    if (!row || row.status !== 'estorno_pendente' || !row.gatewayTxId) return false
    try {
      await gateway.refundPayment(row.gatewayTxId, `pedido:${row.orderId}:estorno:${row.id}`)
    } catch (err) {
      await payments.recordRefundFailure(
        row.id,
        err instanceof AppError ? err.code : 'ESTORNO_FALHOU',
      )
      return false
    }
    await payments.markRefunded(row.id)
    runInBackground(sendRefundMail(row.id)) // RN-NOT-03
    return true
  }

  async function sendRefundMail(paymentId: number) {
    const ctx = await payments.refundMailContext(paymentId)
    if (!ctx) return
    await mail.sendOrderRefunded({
      to: ctx.buyerEmail,
      name: ctx.buyerName,
      productName: ctx.productName,
      orderNumber: orderNumber(ctx.orderId, ctx.createdAt),
      reason: ctx.reason,
    })
  }

  // O comprador só cobra o próprio pedido, ainda Pendente, de pagamento no site.
  async function chargeable(buyerId: number, orderId: number, expiredCode: string) {
    const found = await orders.findById(orderId)
    if (!found) throw notFound('Pedido não encontrado.')
    if (found.buyerId !== buyerId) throw forbidden('Este pedido não é seu.')
    const order = await ordersService.expireIfDue(found) // RN-PAG-12
    if (order.status === 'cancelled') {
      throw new AppError(409, expiredCode, 'Este pedido foi cancelado. Faça um novo pedido.')
    }
    if (order.negotiation !== 'site_payment' || order.status !== 'pending') {
      throw new AppError(409, 'INVALID_STATE', 'Este pedido não aceita pagamento.')
    }
    // Aviso antecipado, sem reservar (RN-PAG-08). A decisão final é da liquidação.
    const listing = await orders.findListing(order.listingId)
    if (
      !listing ||
      listing.deleted ||
      !listing.ownerActive ||
      listing.status === 'paused' ||
      (listing.status === 'sold' && listing.quantity > 0)
    ) {
      throw new AppError(409, 'LISTING_UNAVAILABLE', 'Este anúncio não está mais disponível.')
    }
    if (listing.quantity < order.quantity) {
      throw new AppError(409, 'OUT_OF_STOCK', 'Não há unidades suficientes deste item.')
    }
    return order
  }

  const orderResponse = async (orderId: number) => {
    const order = (await orders.findById(orderId))!
    return toOrderJson(order, new Date(order.createdAt.getTime() + ttlMs))
  }

  // Depois da liquidação, o que a tela de pagamento precisa saber (backend.md §11, cartão).
  async function respondAfterSettle(paymentId: number, orderId: number, outcome: SettleOutcome) {
    await finish(paymentId, outcome)
    if (outcome.kind === 'refund') {
      const code =
        outcome.reason === 'out_of_stock'
          ? 'OUT_OF_STOCK'
          : outcome.reason === 'listing_unavailable'
            ? 'LISTING_UNAVAILABLE'
            : outcome.reason === 'amount_mismatch'
              ? 'PAYMENT_AMOUNT_MISMATCH'
              : 'ORDER_CANCELLED'
      throw new AppError(409, code, 'Não foi possível concluir a compra. O valor será estornado.')
    }
    return orderResponse(orderId)
  }

  // Cria a cobrança no gateway. Falha do gateway não deixa tentativa "pendente" presa: vira recusada.
  async function charge<T>(paymentId: number, run: () => Promise<T>): Promise<T> {
    try {
      return await run()
    } catch (err) {
      await payments.setStatus(paymentId, ['pendente'], 'recusado', GATEWAY_ERROR)
      throw err
    }
  }

  async function syncRow(row: PaymentRow) {
    if (!row.gatewayTxId) return
    const gw = await gateway.getPayment(row.gatewayTxId)
    if (gw.status === 'approved') {
      // RN-PAG-05: o valor que o gateway cobrou tem de ser o registrado na tentativa. Se não for,
      // não liquida: estorna o que foi cobrado e o pedido segue como está.
      if (gw.amountInCents !== row.amountInCents) {
        const marked = await payments.setStatus(
          row.id,
          ['pendente', 'expirado'],
          'estorno_pendente',
          'VALOR_DIVERGENTE',
        )
        if (marked) await refund(row.id)
        return
      }
      await finish(row.id, await payments.settle(row.id))
    } else if (gw.status === 'declined') {
      await payments.setStatus(row.id, ['pendente'], 'recusado')
    } else if (gw.status === 'cancelled') {
      await payments.setStatus(row.id, ['pendente'], 'expirado')
    } else if (gw.status === 'refunded') {
      if (row.status === 'estorno_pendente') {
        await payments.markRefunded(row.id) // o nosso estorno já saiu; o aviso chegou antes da marcação
      } else {
        // Estorno ou chargeback feito fora do sistema (painel do Mercado Pago): o dinheiro já voltou ao
        // comprador. Registra para o admin ver e não mexe sozinho no pedido (decisão humana).
        await payments.setStatus(row.id, ['aprovado'], 'estornado', 'ESTORNO_EXTERNO')
      }
    }
  }

  // Timeout do gateway: a cobrança pode ter sido criada lá e a tentativa ficou sem id. O aviso traz o id
  // e a `reference` (`pedido:N`): se o pedido tem uma tentativa órfã de mesmo valor, ela ganha o id e
  // segue o fluxo normal (liquida se ainda der, senão estorna).
  async function adoptOrphan(gatewayTxId: string): Promise<PaymentRow | null> {
    let gw
    try {
      gw = await gateway.getPayment(gatewayTxId)
    } catch {
      return null // id que não é nosso (ou gateway fora): nada a reconciliar
    }
    const match = /^pedido:(\d+)$/.exec(gw.reference ?? '')
    if (!match) return null
    const orphan = await payments.findOrphanAttempt(Number(match[1]))
    if (!orphan || orphan.amountInCents !== gw.amountInCents) return null
    if (!(await payments.claimOrphan(orphan.id, gatewayTxId))) return null
    // Cobrança ainda aberta que ninguém espera: cancela (melhor esforço). Aprovada segue para a liquidação.
    if (gw.status === 'pending') await gateway.cancelPayment(gatewayTxId).catch(() => undefined)
    return payments.findById(orphan.id)
  }

  async function syncFromGateway(gatewayTxId: string): Promise<void> {
    const row = (await payments.findByGatewayId(gatewayTxId)) ?? (await adoptOrphan(gatewayTxId))
    if (!row) return // não é nosso
    await syncRow(row)
  }

  return {
    // RN-PAG-02, 07: cobra no cartão com o token do gateway. Dado de cartão nunca chega aqui.
    async payWithCard(buyerId: number, input: CardInput) {
      const order = await chargeable(buyerId, input.orderId, 'ORDER_CANCELLED')
      const ctx = (await payments.chargeContext(order.id))!
      const attempt = await payments.createAttempt({
        orderId: order.id,
        method: 'card',
        amountInCents: order.totalInCents,
        expiresAt: null,
      })
      if (attempt.kind === 'in_progress') {
        throw new AppError(
          409,
          'PAYMENT_IN_PROGRESS',
          'Já existe um pagamento em andamento neste pedido.',
        )
      }
      const { payment, idempotencyKey } = attempt
      const gw = await charge(payment.id, () =>
        gateway.createCardPayment({
          token: input.token,
          paymentMethodId: input.paymentMethodId,
          issuerId: input.issuerId,
          installments: input.installments,
          amountInCents: order.totalInCents,
          reference: `pedido:${order.id}`,
          description: ctx.productName,
          payerEmail: ctx.buyerEmail,
          idempotencyKey,
        }),
      )
      await payments.attachGateway(payment.id, gw.id)

      if (gw.status === 'declined' || gw.status === 'cancelled') {
        await payments.setStatus(payment.id, ['pendente'], 'recusado')
        throw new AppError(
          402,
          'PAYMENT_DECLINED',
          'O pagamento foi recusado. Confira os dados ou use outro cartão.',
        ) // RN-PAG-07
      }
      if (gw.status === 'approved') {
        return respondAfterSettle(payment.id, order.id, await payments.settle(payment.id))
      }
      return orderResponse(order.id) // em análise: o webhook decide
    },

    // RN-PAG-04: Pix válido por 30 minutos, o mesmo do pedido. Repetir a chamada devolve o mesmo código.
    async createPix(buyerId: number, orderId: number) {
      const order = await chargeable(buyerId, orderId, 'PIX_EXPIRED')
      const expiresAt = new Date(order.createdAt.getTime() + ttlMs)

      const existing = await payments.findPendingByMethod(order.id, 'pix')
      if (existing?.gatewayTxId) {
        const gw = await gateway.getPayment(existing.gatewayTxId)
        if (gw.qrCode) return { code: gw.qrCode, expiresAt: expiresAt.toISOString() }
      }

      const ctx = (await payments.chargeContext(order.id))!
      const attempt = await payments.createAttempt({
        orderId: order.id,
        method: 'pix',
        amountInCents: order.totalInCents,
        expiresAt,
      })
      if (attempt.kind === 'in_progress') {
        throw new AppError(
          409,
          'PAYMENT_IN_PROGRESS',
          'Já existe um pagamento em andamento neste pedido.',
        )
      }
      const { payment, idempotencyKey } = attempt
      const gw = await charge(payment.id, () =>
        gateway.createPixPayment({
          amountInCents: order.totalInCents,
          expiresAt,
          reference: `pedido:${order.id}`,
          description: ctx.productName,
          payerEmail: ctx.buyerEmail,
          idempotencyKey,
        }),
      )
      await payments.attachGateway(payment.id, gw.id)
      if (!gw.qrCode) {
        await payments.setStatus(payment.id, ['pendente'], 'recusado', 'SEM_QR_CODE')
        throw new AppError(502, 'EXTERNAL_SERVICE_ERROR', 'Serviço de pagamento indisponível.')
      }
      return { code: gw.qrCode, expiresAt: expiresAt.toISOString() }
    },

    // Sincroniza um pagamento com o gateway: o status é sempre o consultado, nunca o do aviso (RN-PAG-05).
    syncFromGateway,

    // Webhook sem JWT (backend.md §9.6): assinatura primeiro (401), depois consulta no gateway.
    async handleWebhook(input: WebhookInput): Promise<void> {
      const { paymentId } = gateway.verifyWebhook(input)
      if (paymentId) await syncFromGateway(paymentId)
    },

    // Job `reconcile-pending-payments`: webhook perdido e estornos que falharam (backend.md §14).
    async reconcilePending(olderThanMinutes = 2, limit = 50) {
      const rows = await payments.findStalePending(
        new Date(now().getTime() - olderThanMinutes * 60_000),
        new Date(now().getTime() - EXPIRED_LOOKBACK_MS), // RN-PAG-13: Pix pago depois de expirar
        limit,
      )
      let synced = 0
      for (const row of rows) {
        try {
          await syncRow(row)
          synced++
        } catch {
          // um pagamento com problema não trava os outros; segue na próxima rodada
        }
      }
      const refunds = await payments.findPendingRefunds(MAX_REFUND_ATTEMPTS, limit)
      let refunded = 0
      for (const row of refunds) if (await refund(row.id)) refunded++
      return { synced, refunded }
    },

    /** Só para o simulador do ambiente de desenvolvimento (gateway falso). */
    async pendingGatewayId(orderId: number) {
      return (await payments.findPendingByMethod(orderId, 'pix'))?.gatewayTxId ?? null
    },
  }
}
export type PaymentsService = ReturnType<typeof createPaymentsService>

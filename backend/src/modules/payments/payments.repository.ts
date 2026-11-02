import { Prisma, type PrismaClient } from '../../generated/prisma/client'
import { decrementStock, lockListingRow, lockOrder } from '../../shared/database/stock'
import { centsToDecimal, decimalToCents } from '../../shared/utils/money'
import {
  GATEWAY_ERROR,
  type PaymentRepository,
  type PaymentRow,
  type PaymentStatus,
  type RefundReason,
  type SettleOutcome,
} from './payments.types'

type Row = Prisma.PaymentGetPayload<object>

const toRow = (r: Row): PaymentRow => ({
  id: r.id,
  orderId: r.orderId,
  gatewayTxId: r.gatewayTxId,
  method: r.method === 'pix' ? 'pix' : 'card',
  status: r.status as PaymentStatus,
  amountInCents: r.amount ? decimalToCents(r.amount) : 0,
  refundAttempts: r.refundAttempts,
  lastError: r.lastError,
  createdAt: r.createdAt,
})

const AMOUNT_MISMATCH = 'VALOR_DIVERGENTE'

export function createPrismaPaymentRepository(db: PrismaClient): PaymentRepository {
  return {
    async chargeContext(orderId) {
      const o = await db.order.findUnique({
        where: { id: orderId },
        include: { buyer: { select: { name: true, email: true } } },
      })
      if (!o) return null
      return {
        orderId: o.id,
        buyerId: o.buyerId,
        buyerEmail: o.buyer.email,
        buyerName: o.buyer.name,
        productName: o.productName,
      }
    },

    async findPendingByMethod(orderId, method) {
      const r = await db.payment.findFirst({
        where: { orderId, status: 'pendente', method: method === 'pix' ? 'pix' : 'cartao' },
        orderBy: { id: 'desc' },
      })
      return r ? toRow(r) : null
    },

    // Uma linha por tentativa. A chave de idempotência leva o número da tentativa, para uma nova
    // cobrança não repetir a chave da recusada (backend.md §11).
    async createAttempt({ orderId, method, amountInCents, expiresAt }) {
      try {
        return await db.$transaction(async (tx) => {
          await lockOrder(tx, orderId)
          const attempt = (await tx.payment.count({ where: { orderId } })) + 1
          const idempotencyKey = `pedido:${orderId}:${method}:${attempt}`
          const row = await tx.payment.create({
            data: {
              orderId,
              method: method === 'pix' ? 'pix' : 'cartao',
              status: 'pendente',
              amount: centsToDecimal(amountInCents),
              expiresAt,
              idempotencyKey,
            },
          })
          return { kind: 'created' as const, payment: toRow(row), idempotencyKey }
        })
      } catch (err) {
        // uq_pagamento_ativo: já existe uma tentativa pendente ou aprovada neste pedido.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          return { kind: 'in_progress' as const }
        }
        throw err
      }
    },

    async attachGateway(paymentId, gatewayTxId) {
      await db.payment.update({ where: { id: paymentId }, data: { gatewayTxId } })
    },

    async setStatus(paymentId, from, to, lastError) {
      const res = await db.payment.updateMany({
        where: { id: paymentId, status: { in: from } },
        data: { status: to, ...(lastError !== undefined && { lastError }) },
      })
      return res.count === 1
    },

    async findByGatewayId(gatewayTxId) {
      const r = await db.payment.findFirst({ where: { gatewayTxId } })
      return r ? toRow(r) : null
    },

    async findById(paymentId) {
      const r = await db.payment.findUnique({ where: { id: paymentId } })
      return r ? toRow(r) : null
    },

    // Liquidação (backend.md §11). Trava o pedido, relê o pagamento já com a trava e decide em um só
    // lugar: Pago, ou Cancelado com `estorno_pendente`. Idempotente: pagamento já liquidado = noop.
    async settle(paymentId): Promise<SettleOutcome> {
      return db.$transaction(async (tx) => {
        const first = await tx.payment.findUnique({ where: { id: paymentId } })
        if (!first) return { kind: 'noop' }
        await lockOrder(tx, first.orderId)
        const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } })
        // `expirado` entra: o Pix pago depois do cancelamento precisa ser estornado (RN-PAG-13).
        if (payment.status !== 'pendente' && payment.status !== 'expirado') return { kind: 'noop' }

        const order = await tx.order.findUniqueOrThrow({
          where: { id: payment.orderId },
          include: { listing: { include: { user: { select: { accountStatus: true } } } } },
        })
        const toRefund = async (
          reason: RefundReason,
          cancelReason?: string,
          lastError?: string,
        ) => {
          if (cancelReason) {
            await tx.order.update({
              where: { id: order.id },
              data: { status: 'cancelado', cancelReason, updatedAt: new Date() },
            })
          }
          // `estorno_pendente` é gravado ANTES de chamar o gateway: se algo falhar no meio, o job acha a linha.
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: 'estorno_pendente',
              paidAt: new Date(),
              ...(lastError !== undefined && { lastError }),
            },
          })
          return { kind: 'refund', reason } as const
        }

        // Pedido que já não está Pendente (cancelado, ou pago por outra cobrança): estorna sem mexer no estoque.
        if (order.status !== 'pendente') return toRefund('late_payment')

        // RN-PAG-05: o valor cobrado tem de ser o do pedido. Se divergir (pedido alterado depois da
        // cobrança, ou cobrança errada), não liquida: estorna e deixa o pedido como está. Nenhum
        // motivo_cancelamento do CHECK descreve isso, então o pedido não é cancelado.
        if (
          !payment.amount ||
          decimalToCents(payment.amount) !== decimalToCents(order.totalAmount)
        ) {
          return toRefund('amount_mismatch', undefined, AMOUNT_MISMATCH)
        }
        // Cobrança reaberta (expirada ou órfã) com outra tentativa em andamento: o índice
        // uq_pagamento_ativo não admite dois ativos. Estorna esta; a outra segue seu curso.
        if (payment.status !== 'pendente') {
          const active = await tx.payment.count({
            where: {
              orderId: order.id,
              id: { not: payment.id },
              status: { in: ['pendente', 'aprovado'] },
            },
          })
          if (active > 0) return toRefund('late_payment')
        }

        const listing = order.listing
        await lockListingRow(tx, listing.id)
        const current = await tx.listing.findUniqueOrThrow({ where: { id: listing.id } })
        const unavailable =
          current.deletedAt !== null ||
          listing.user.accountStatus !== 'ativa' ||
          current.status === 'pausado' ||
          (current.status === 'vendido' && current.quantity > 0)
        if (unavailable) return toRefund('listing_unavailable', 'anuncio_indisponivel') // RN-PAG-14

        if (!(await decrementStock(tx, listing.id, order.quantity))) {
          return toRefund('out_of_stock', 'sem_estoque') // RN-PAG-08
        }
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'pago', updatedAt: new Date() },
        })
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'aprovado', paidAt: new Date() },
        })
        return { kind: 'paid' }
      })
    },

    async findPendingRefunds(maxAttempts, limit) {
      const rows = await db.payment.findMany({
        where: { status: 'estorno_pendente', refundAttempts: { lt: maxAttempts } },
        orderBy: { id: 'asc' },
        take: limit,
      })
      return rows.map(toRow)
    },

    async markRefunded(paymentId) {
      // VALOR_DIVERGENTE fica gravado (o e-mail e o admin precisam dele); erros de estorno saem.
      await db.payment.updateMany({
        where: {
          id: paymentId,
          status: 'estorno_pendente',
          OR: [{ lastError: null }, { lastError: { not: AMOUNT_MISMATCH } }],
        },
        data: { status: 'estornado', lastError: null },
      })
      await db.payment.updateMany({
        where: { id: paymentId, status: 'estorno_pendente' },
        data: { status: 'estornado' },
      })
    },

    async recordRefundFailure(paymentId, message) {
      await db.payment.update({
        where: { id: paymentId },
        data: { refundAttempts: { increment: 1 }, lastError: message.slice(0, 500) },
      })
    },

    // Pendentes (webhook perdido) e expirados recentes: um Pix pago no fim da janela, depois do
    // cancelamento, precisa ser achado e estornado (RN-PAG-13). Duas consultas, cada uma com seu limite,
    // para os expirados (que podem nunca mudar) não tomarem a vez dos pendentes.
    async findStalePending(createdBefore, expiredSince, limit) {
      const pending = await db.payment.findMany({
        where: {
          status: 'pendente',
          gatewayTxId: { not: null },
          createdAt: { lte: createdBefore },
        },
        orderBy: { id: 'asc' },
        take: limit,
      })
      const expired = await db.payment.findMany({
        where: { status: 'expirado', gatewayTxId: { not: null }, createdAt: { gte: expiredSince } },
        orderBy: { id: 'desc' },
        take: limit,
      })
      return [...pending, ...expired].map(toRow)
    },

    // Timeout do gateway: a cobrança pode existir lá sem id aqui. A tentativa fica recusada com
    // GATEWAY_ERROR e sem gatewayTxId; é ela que um aviso desconhecido reivindica.
    async findOrphanAttempt(orderId) {
      const r = await db.payment.findFirst({
        where: { orderId, status: 'recusado', gatewayTxId: null, lastError: GATEWAY_ERROR },
        orderBy: { id: 'desc' },
      })
      return r ? toRow(r) : null
    },

    async claimOrphan(paymentId, gatewayTxId) {
      const res = await db.payment.updateMany({
        where: { id: paymentId, status: 'recusado', gatewayTxId: null, lastError: GATEWAY_ERROR },
        data: { gatewayTxId, status: 'expirado', lastError: null },
      })
      return res.count === 1
    },

    async saleMailContext(paymentId) {
      const p = await db.payment.findUnique({
        where: { id: paymentId },
        include: { order: { include: { seller: { select: { name: true, email: true } } } } },
      })
      if (!p) return null
      return {
        sellerEmail: p.order.seller.email,
        sellerName: p.order.seller.name,
        productName: p.order.productName,
        quantity: p.order.quantity,
        totalInCents: decimalToCents(p.order.totalAmount),
        orderId: p.order.id,
        createdAt: p.order.createdAt,
      }
    },

    async refundMailContext(paymentId) {
      const p = await db.payment.findUnique({
        where: { id: paymentId },
        include: { order: { include: { buyer: { select: { name: true, email: true } } } } },
      })
      if (!p) return null
      const cancel = p.order.cancelReason
      return {
        buyerEmail: p.order.buyer.email,
        buyerName: p.order.buyer.name,
        productName: p.order.productName,
        orderId: p.order.id,
        createdAt: p.order.createdAt,
        reason:
          p.lastError === AMOUNT_MISMATCH
            ? 'amount_mismatch'
            : cancel === 'sem_estoque'
              ? 'out_of_stock'
              : cancel === 'anuncio_indisponivel'
                ? 'listing_unavailable'
                : 'late_payment',
      }
    },
  }
}

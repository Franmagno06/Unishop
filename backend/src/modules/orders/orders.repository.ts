import { Prisma, type PrismaClient } from '../../generated/prisma/client'
import { AppError } from '../../shared/errors/app-error'
import {
  CANCEL_REASON_FROM_DB,
  CANCEL_REASON_TO_DB,
  LISTING_STATUS_FROM_DB,
  ORDER_STATUS_FROM_DB,
  ORDER_STATUS_TO_DB,
} from '../../shared/database/status-maps'
import { decrementStock, lockListingRow, lockOrder } from '../../shared/database/stock'
import { centsToDecimal, decimalToCents } from '../../shared/utils/money'
import type { ListingForOrder, Negotiation, OrderRecord, OrderRepository } from './orders.types'

const include = {
  buyer: { select: { name: true } },
  seller: { select: { name: true } },
  listing: { select: { description: true, whatsapp: true } },
  payments: { orderBy: { id: 'desc' }, select: { method: true, status: true } },
  review: { select: { id: true } },
} satisfies Prisma.OrderInclude

type OrderRow = Prisma.OrderGetPayload<{ include: typeof include }>

function toRecord(row: OrderRow): OrderRecord {
  const last = row.payments[0]
  return {
    id: row.id,
    listingId: row.listingId,
    buyerId: row.buyerId,
    sellerId: row.sellerId,
    negotiation: row.negotiationType === 'whatsapp' ? 'whatsapp' : 'site_payment',
    status: ORDER_STATUS_FROM_DB[row.status]!,
    productName: row.productName,
    imageUrl: row.imageUrl,
    quantity: row.quantity,
    unitPriceInCents: decimalToCents(row.unitPrice),
    feeInCents: decimalToCents(row.serviceFee),
    totalInCents: decimalToCents(row.totalAmount),
    createdAt: row.createdAt,
    completedAt: row.completedAt,
    cancelReason: row.cancelReason ? (CANCEL_REASON_FROM_DB[row.cancelReason] ?? null) : null,
    buyerName: row.buyer.name,
    sellerName: row.seller.name,
    sellerWhatsapp: row.listing.whatsapp,
    listingDescription: row.listing.description,
    payment: last ? { method: last.method === 'pix' ? 'pix' : 'card', status: last.status } : null,
    refunded: row.payments.some((p) => p.status === 'estornado'),
    reviewed: row.review !== null,
  }
}

// Pedido cancelado: a cobrança em aberto deixa de valer. Um aviso de pagamento que chegue depois
// ainda é liquidado (e estornado) pela liquidação, que aceita linhas pendente e expirado (RN-PAG-13).
const expirePendingPayments = (tx: Prisma.TransactionClient, orderId: number) =>
  tx.payment.updateMany({ where: { orderId, status: 'pendente' }, data: { status: 'expirado' } })

export function createPrismaOrderRepository(db: PrismaClient): OrderRepository {
  const findById = async (id: number) => {
    const row = await db.order.findUnique({ where: { id }, include })
    return row ? toRecord(row) : null
  }

  return {
    async findListing(listingId) {
      const row = await db.listing.findUnique({
        where: { id: listingId },
        include: {
          user: { select: { accountStatus: true } },
          images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
        },
      })
      if (!row) return null
      const listing: ListingForOrder = {
        id: row.id,
        ownerId: row.userId,
        ownerActive: row.user.accountStatus === 'ativa',
        // valor desconhecido no banco: trata como pausado (nunca vende)
        status: LISTING_STATUS_FROM_DB[row.status] ?? 'paused',
        deleted: row.deletedAt !== null,
        quantity: row.quantity,
        priceInCents: decimalToCents(row.price),
        title: row.name,
        imageUrl: row.images[0]?.url ?? null,
      }
      return listing
    },

    async incrementContacts(listingId) {
      await db.listing.update({ where: { id: listingId }, data: { contacts: { increment: 1 } } })
    },

    async createOrReuse(data) {
      const forma: string = data.negotiation === 'whatsapp' ? 'whatsapp' : 'pagamento_site'
      const status = data.negotiation === 'whatsapp' ? 'em_negociacao' : 'pendente'
      const total = data.listing.priceInCents * data.quantity + data.feeInCents
      const where = {
        buyerId: data.buyerId,
        listingId: data.listing.id,
        negotiationType: forma,
        status,
      }

      const reuse = async () => {
        const open = await db.order.findFirst({ where })
        if (!open) return null
        // Só o pedido Pendente tem valor a atualizar; a quantidade nova refaz o total (RN-PED-10).
        // Com cobrança pendente ou aprovada o valor fica travado: a liquidação confere o valor cobrado
        // com o do pedido (RN-PAG-05). Mesma quantidade devolve o pedido; outra, 409.
        await db.$transaction(async (tx) => {
          await lockOrder(tx, open.id)
          if (status === 'pendente') {
            const charging = await tx.payment.count({
              where: { orderId: open.id, status: { in: ['pendente', 'aprovado'] } },
            })
            if (charging > 0) {
              if (open.quantity === data.quantity) return
              throw new AppError(
                409,
                'PAYMENT_IN_PROGRESS',
                'Já existe um pagamento em andamento neste pedido. Conclua ou aguarde antes de mudar a quantidade.',
              )
            }
          }
          await tx.order.updateMany({
            where: { id: open.id, status },
            data: {
              quantity: data.quantity,
              unitPrice: centsToDecimal(data.listing.priceInCents),
              serviceFee: centsToDecimal(data.feeInCents),
              totalAmount: centsToDecimal(total),
              updatedAt: new Date(),
            },
          })
        })
        return (await findById(open.id))!
      }

      const existing = await reuse()
      if (existing) return { order: existing, created: false }
      try {
        const row = await db.order.create({
          data: {
            listingId: data.listing.id,
            buyerId: data.buyerId,
            sellerId: data.listing.ownerId,
            negotiationType: forma,
            status,
            productName: data.listing.title,
            imageUrl: data.listing.imageUrl,
            quantity: data.quantity,
            unitPrice: centsToDecimal(data.listing.priceInCents),
            serviceFee: centsToDecimal(data.feeInCents),
            totalAmount: centsToDecimal(total),
          },
          include,
        })
        return { order: toRecord(row), created: true }
      } catch (err) {
        // Dois cliques ao mesmo tempo: o índice único barrou o segundo; devolve o pedido do primeiro.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const raced = await reuse()
          if (raced) return { order: raced, created: false }
        }
        throw err
      }
    },

    findById,

    async findOpen(buyerId, listingId, negotiation) {
      const row = await db.order.findFirst({
        where: {
          buyerId,
          listingId,
          negotiationType: negotiation === 'whatsapp' ? 'whatsapp' : 'pagamento_site',
          status: negotiation === 'whatsapp' ? 'em_negociacao' : 'pendente',
        },
        include,
      })
      return row ? toRecord(row) : null
    },

    async findByBuyer(buyerId) {
      const rows = await db.order.findMany({
        where: { buyerId },
        include,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      })
      return rows.map(toRecord)
    },

    async findBySeller(sellerId, listingId) {
      const rows = await db.order.findMany({
        where: { sellerId, ...(listingId !== undefined && { listingId }) },
        include,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      })
      return rows.map(toRecord)
    },

    async transition(id, from, to) {
      const res = await db.order.updateMany({
        where: { id, status: { in: from.map((s) => ORDER_STATUS_TO_DB[s]) } },
        data: { status: ORDER_STATUS_TO_DB[to], updatedAt: new Date() },
      })
      return res.count === 1
    },

    // RN-EST-03, 04, 06 e RN-PED-13: trava o pedido, desconta o estoque com UPDATE condicional e só
    // então conclui. Se o estoque não bastar, nada muda e o pedido segue Em negociação.
    async completeNegotiation(id) {
      return db.$transaction(async (tx) => {
        await lockOrder(tx, id)
        const order = await tx.order.findUnique({ where: { id } })
        if (!order || order.status !== 'em_negociacao') return 'not_open' as const
        await lockListingRow(tx, order.listingId)
        if (!(await decrementStock(tx, order.listingId, order.quantity))) {
          return 'out_of_stock' as const
        }
        await tx.order.update({
          where: { id },
          data: { status: 'concluido', completedAt: new Date(), updatedAt: new Date() },
        })
        return 'ok' as const
      })
    },

    async completePickup(id) {
      const res = await db.order.updateMany({
        where: { id, status: 'retirada_combinada' },
        data: { status: 'concluido', completedAt: new Date(), updatedAt: new Date() },
      })
      return res.count === 1
    },

    async cancel(id, from, reason) {
      return db.$transaction(async (tx) => {
        const res = await tx.order.updateMany({
          where: { id, status: { in: from.map((s) => ORDER_STATUS_TO_DB[s]) } },
          data: {
            status: 'cancelado',
            cancelReason: reason ? CANCEL_REASON_TO_DB[reason] : null,
            updatedAt: new Date(),
          },
        })
        if (res.count === 1) await expirePendingPayments(tx, id)
        return res.count === 1
      })
    },

    async expire(id, createdBefore) {
      return db.$transaction(async (tx) => {
        const res = await tx.order.updateMany({
          where: { id, status: 'pendente', createdAt: { lte: createdBefore } },
          data: {
            status: 'cancelado',
            cancelReason: CANCEL_REASON_TO_DB.expired,
            updatedAt: new Date(),
          },
        })
        if (res.count === 1) await expirePendingPayments(tx, id)
        return res.count === 1
      })
    },

    async findExpiredIds(createdBefore) {
      const rows = await db.order.findMany({
        where: { status: 'pendente', createdAt: { lte: createdBefore } },
        select: { id: true },
      })
      return rows.map((r) => r.id)
    },

    async findPendingGatewayId(orderId) {
      const row = await db.payment.findFirst({
        where: { orderId, status: 'pendente', gatewayTxId: { not: null } },
        select: { gatewayTxId: true },
      })
      return row?.gatewayTxId ?? null
    },
  }
}
export type { Negotiation }

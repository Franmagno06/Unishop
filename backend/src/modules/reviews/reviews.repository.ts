import { Prisma, type PrismaClient } from '../../generated/prisma/client'
import { AppError } from '../../shared/errors/app-error'
import { ORDER_STATUS_FROM_DB } from '../../shared/database/status-maps'
import type { ReviewRecord, ReviewRepository } from './reviews.types'

const include = { author: { select: { name: true } } } satisfies Prisma.ReviewInclude
type ReviewRow = Prisma.ReviewGetPayload<{ include: typeof include }>

const toRecord = (row: ReviewRow): ReviewRecord => ({
  id: row.id,
  listingId: row.listingId,
  authorName: row.author.name,
  rating: Number(row.rating),
  comment: row.comment,
  createdAt: row.createdAt,
})

export function createPrismaReviewRepository(db: PrismaClient): ReviewRepository {
  return {
    async findOrder(id) {
      const row = await db.order.findUnique({
        where: { id },
        select: {
          id: true,
          listingId: true,
          buyerId: true,
          status: true,
          review: { select: { id: true } },
        },
      })
      if (!row) return null
      return {
        id: row.id,
        listingId: row.listingId,
        buyerId: row.buyerId,
        status: ORDER_STATUS_FROM_DB[row.status]!,
        reviewed: row.review !== null,
      }
    },

    async create(input) {
      try {
        const row = await db.review.create({
          data: {
            orderId: input.orderId,
            listingId: input.listingId,
            authorId: input.authorId,
            rating: input.rating,
            comment: input.comment,
          },
          include,
        })
        return toRecord(row)
      } catch (err) {
        // Duas avaliações ao mesmo tempo: o unique `uq_avaliacao_pedido` deixa passar só uma (RN-AVA-02).
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new AppError(409, 'ALREADY_REVIEWED', 'Você já avaliou este pedido.')
        }
        throw err
      }
    },

    async listByListing(listingId) {
      const rows = await db.review.findMany({
        where: { listingId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include,
      })
      return rows.map(toRecord)
    },

    async listingExists(listingId) {
      const row = await db.listing.findFirst({
        where: { id: listingId, deletedAt: null },
        select: { id: true },
      })
      return row !== null
    },
  }
}

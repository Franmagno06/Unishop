import { AppError, forbidden, notFound } from '../../shared/errors/app-error'
import { toReviewJson } from './reviews.serializer'
import type { ReviewRepository } from './reviews.types'

type Deps = { reviews: ReviewRepository }

export function createReviewsService({ reviews }: Deps) {
  return {
    // RN-AVA-01: só o comprador, e só de pedido Concluído. RN-AVA-02: uma por pedido.
    async create(userId: number, orderId: number, input: { rating: number; comment: string }) {
      const order = await reviews.findOrder(orderId)
      if (!order) throw notFound('Pedido não encontrado.')
      if (order.buyerId !== userId) throw forbidden('Este pedido não é seu.')
      if (order.status !== 'completed') {
        throw new AppError(409, 'INVALID_STATE', 'Só é possível avaliar um pedido concluído.')
      }
      if (order.reviewed) {
        throw new AppError(409, 'ALREADY_REVIEWED', 'Você já avaliou este pedido.')
      }
      return toReviewJson(
        await reviews.create({
          orderId,
          listingId: order.listingId,
          authorId: userId,
          rating: input.rating,
          comment: input.comment,
        }),
      )
    },

    // RN-AVA-05: logado lê; mais recentes primeiro. Anúncio inexistente ou excluído = 404.
    async list(listingId: number) {
      if (!(await reviews.listingExists(listingId))) throw notFound('Anúncio não encontrado.')
      return (await reviews.listByListing(listingId)).map(toReviewJson)
    },
  }
}
export type ReviewsService = ReturnType<typeof createReviewsService>

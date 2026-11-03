import type { ReviewRecord } from './reviews.types'

export function toReviewJson(review: ReviewRecord) {
  return {
    id: review.id,
    listingId: review.listingId,
    authorName: review.authorName,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
  }
}
export type ReviewJson = ReturnType<typeof toReviewJson>

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createReview, getReviews } from '../services/reviews.service'
import type { NewReview } from '../types/review.types'

export const reviewsKey = (listingId: number) => ['listing', listingId, 'reviews'] as const

export function useReviews(listingId: number) {
  return useQuery({ queryKey: reviewsKey(listingId), queryFn: () => getReviews(listingId) })
}

export function useCreateReview(listingId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (review: NewReview) => createReview(listingId, review),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reviewsKey(listingId) }),
  })
}

import { useQuery } from '@tanstack/react-query'
import { getListingById } from '../services/listings.service'

// Detalhe de um anúncio. `data === null` quando o id não é de um anúncio visível.
export function useListing(listingId: number | null) {
  return useQuery({
    queryKey: ['listing', listingId],
    queryFn: ({ signal }) => getListingById(listingId as number, signal),
    enabled: listingId !== null,
  })
}

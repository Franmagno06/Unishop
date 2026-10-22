import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { getListings, PAGE_SIZE } from '../services/listings.service'
import type { ContactMode, ListingSort } from '../types/listing.types'

type Params = { categoryId: number | null; contact: ContactMode | undefined; sort: ListingSort }

// Rolagem infinita: cada página é pedida ao chegar perto do fim da lista (RF007). Trocar de filtro
// ou de ordem recomeça da primeira página; a lista anterior fica na tela até a nova chegar.
export function useListings({ categoryId, contact, sort }: Params) {
  return useInfiniteQuery({
    queryKey: ['listings', { categoryId, contact, sort }],
    queryFn: ({ pageParam, signal }) =>
      getListings({ categoryId: categoryId as number, contact, sort, page: pageParam, limit: PAGE_SIZE, signal }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    placeholderData: keepPreviousData,
    enabled: categoryId !== null,
  })
}

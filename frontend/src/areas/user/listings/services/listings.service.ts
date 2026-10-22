import type { ContactMode, ListingSort, ListingsPage } from '../types/listing.types'
import { exampleListings } from './listings.data'

export const PAGE_SIZE = 12 // 3 linhas de 4 cards; o backend aceita até 50 (backend.md §9.4)

export type ListingsQuery = {
  categoryId: number
  contact?: ContactMode | undefined
  sort?: ListingSort
  page?: number
  limit?: number
  signal?: AbortSignal | undefined
}

// Dados de exemplo no formato assumido de GET /listings?category=&sort=&page=&limit=
// (RN-ANU-05 a 07: só anúncios visíveis, mais recentes primeiro por padrão).
// Quando a API existir, só esta função muda. O filtro por forma de contato não existe na API.
export async function getListings({
  categoryId,
  contact,
  sort = 'recent',
  page = 1,
  limit = PAGE_SIZE,
  signal,
}: ListingsQuery): Promise<ListingsPage> {
  signal?.throwIfAborted()

  let items = exampleListings.filter((listing) => listing.categoryId === categoryId)
  if (contact) items = items.filter((listing) => listing.contact.mode === contact)

  if (sort === 'price_asc') {
    items = [...items].sort((a, b) => a.priceInCents - b.priceInCents || b.publishedAt.localeCompare(a.publishedAt))
  } else if (sort === 'price_desc') {
    items = [...items].sort((a, b) => b.priceInCents - a.priceInCents || b.publishedAt.localeCompare(a.publishedAt))
  } else {
    items = [...items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  }

  const start = (page - 1) * limit
  return {
    items: items.slice(start, start + limit),
    total: items.length,
    page,
    pageSize: limit,
    hasNext: start + limit < items.length,
  }
}

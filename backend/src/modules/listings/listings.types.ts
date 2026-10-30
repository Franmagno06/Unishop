import type { Pagination } from '../../shared/utils/pagination'

// Estados na API em inglês; o banco guarda em português (ativo, pausado, vendido) e o repository converte.
export type ListingStatus = 'active' | 'paused' | 'sold'
export type ListingSort = 'recent' | 'price_asc' | 'price_desc'

export type ListingSummaryRecord = {
  id: number
  title: string
  priceInCents: number
  categoryId: number
  categoryName: string
  imageUrl: string | null // imagem de ordem 1
  publishedAt: Date
}

export type ListingDetailRecord = {
  id: number
  title: string
  description: string
  priceInCents: number
  quantity: number
  whatsapp: string
  status: ListingStatus
  categoryId: number
  categoryName: string
  publishedAt: Date
  deletedAt: Date | null
  images: { id: number; url: string; position: number }[]
  owner: {
    id: number
    name: string
    course: string | null
    verified: boolean
    accountActive: boolean
  }
}

export type ListFilters = {
  categoryId?: number | undefined
  search?: string | undefined
  minPriceCents?: number | undefined
  maxPriceCents?: number | undefined
  sort: ListingSort
}

export interface ListingRepository {
  /** Só anúncios visíveis (RN-ANU-05), com filtros, ordenação e paginação. */
  findVisiblePage(
    filters: ListFilters,
    pagination: Pagination,
  ): Promise<{ items: ListingSummaryRecord[]; total: number }>
  /** Os visíveis mais novos primeiro (carrossel). */
  findRecent(limit: number): Promise<ListingSummaryRecord[]>
  /** Sem filtro de visibilidade: quem decide é o service (o dono vê o próprio em qualquer status). */
  findById(id: number): Promise<ListingDetailRecord | null>
  /** +1 visualização, atômico (RN-ANU-11). */
  incrementViews(id: number): Promise<void>
}

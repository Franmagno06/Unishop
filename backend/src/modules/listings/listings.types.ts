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
  views: number
  contacts: number
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

export type NewListingData = {
  ownerId: number
  title: string
  categoryId: number
  description: string
  priceInCents: number
  quantity: number
  whatsapp: string
}

export type ListingPatch = {
  [K in keyof Omit<NewListingData, 'ownerId'>]?: NewListingData[K] | undefined
}

/** Imagem já enviada ao storage, pronta para ser registrada no banco. */
export type StoredImage = { url: string; publicId: string }

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
  categoryExists(id: number): Promise<boolean>
  /** Anúncio ativo e a imagem de ordem 1, na mesma transação (RN-ANU-01, 03). */
  createWithImage(data: NewListingData, image: StoredImage): Promise<ListingDetailRecord>
  /** Próxima ordem livre de 1 a 5; `'full'` se já há 5 imagens (RN-ANU-03). */
  addImage(
    listingId: number,
    image: StoredImage,
  ): Promise<{ id: number; url: string; position: number } | 'full'>
  /** "Meus anúncios": todos os status, menos os excluídos, do mais novo (RF012.5). */
  findByOwner(ownerId: number): Promise<ListingDetailRecord[]>
  update(id: number, patch: ListingPatch): Promise<void>
  /** Troca o estado só se ainda estiver em um dos de origem; `false` se outra requisição chegou antes. */
  changeStatus(id: number, from: ListingStatus[], to: ListingStatus): Promise<boolean>
  /** Exclusão lógica; `blocked` com pedido Pago ou em Retirada combinada em aberto (RN-ANU-09). */
  softDelete(id: number): Promise<'ok' | 'blocked'>
  /** Pedidos recebidos pelo anúncio, de qualquer estado (RN-ANU-08). */
  countOrders(id: number): Promise<number>
  /** Remove e renumera para a principal continuar na ordem 1; o anúncio mantém pelo menos 1 imagem. */
  removeImage(
    listingId: number,
    imageId: number,
  ): Promise<{ publicId: string } | 'last' | 'not_found'>
}

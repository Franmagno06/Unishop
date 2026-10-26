// Estado do anúncio (banco `anuncio.status`): o admin diz "produto" para o mesmo anúncio.
export type ListingStatus = 'active' | 'paused' | 'sold'

// Página de resultados no formato assumido das listas do admin (GET /admin/users e /admin/listings,
// backend.md §9): o openapi.yaml ainda não existe.
export type Page<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

import { ApiError, api } from '../../../../shared/lib/api'
import { getCurrentUser, loadCurrentUser } from '../../../../shared/lib/current-user'
import { MOCK_MODE } from '../../../../shared/lib/mock-mode'
import type {
  ContactMode,
  CreatedListing,
  ListingDetail,
  ListingSort,
  ListingsPage,
  ListingSummary,
  NewListing,
} from '../types/listing.types'

export const PAGE_SIZE = 12 // 3 linhas de 4 cards; o backend aceita até 50 (backend.md §9.4)

export type ListingsQuery = {
  categoryId: number
  contact?: ContactMode | undefined
  sort?: ListingSort
  page?: number
  limit?: number
  signal?: AbortSignal | undefined
}

// Formatos da API (listings.serializer.ts do backend). Dinheiro em centavos, datas em ISO (UTC).
type ApiSummary = {
  id: number
  title: string
  priceInCents: number
  categoryId: number
  imageUrl: string | null
  publishedAt: string
}

type ApiDetail = {
  id: number
  title: string
  description: string
  priceInCents: number
  quantity: number
  categoryId: number
  categoryName: string
  images: { id: number; url: string }[]
  seller: { name: string; course: string | null }
  isOwn: boolean
}

// O anúncio só guarda o WhatsApp (a forma de negociação nasce no pedido), então todo card real
// mostra "WhatsApp". O filtro por forma de contato não existe na API e é ignorado (listing.types.ts).
const toSummary = (item: ApiSummary): ListingSummary => ({
  id: item.id,
  title: item.title,
  priceInCents: item.priceInCents,
  categoryId: item.categoryId,
  contact: { mode: 'whatsapp' },
  imageUrl: item.imageUrl,
  publishedAt: item.publishedAt,
})

const toDetail = (item: ApiDetail): ListingDetail => ({
  id: item.id,
  title: item.title,
  priceInCents: item.priceInCents,
  description: item.description,
  quantity: item.quantity,
  categoryId: item.categoryId,
  images: item.images.map((image) => image.url),
  seller: { name: item.seller.name, course: item.seller.course },
  isOwn: item.isOwn,
})

// GET /listings?category=&sort=&page=&limit= (RN-ANU-05 a 07): só anúncios visíveis, mais recentes
// primeiro por padrão. Resposta: { data, meta: { page, limit, total, totalPages } }.
export async function getListings({
  categoryId,
  contact,
  sort = 'recent',
  page = 1,
  limit = PAGE_SIZE,
  signal,
}: ListingsQuery): Promise<ListingsPage> {
  if (import.meta.env.DEV && MOCK_MODE) {
    return (await import('./listings.mock')).getListings({ categoryId, contact, sort, page, limit, signal })
  }
  const query = new URLSearchParams({
    category: String(categoryId),
    sort,
    page: String(page),
    limit: String(limit),
  })
  const response = await api<{
    data: ApiSummary[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  }>(`/listings?${query}`, { signal })
  return {
    items: response.data.map(toSummary),
    total: response.meta.total,
    page: response.meta.page,
    pageSize: response.meta.limit,
    hasNext: response.meta.page < response.meta.totalPages,
  }
}

// O formulário nasce com o WhatsApp do perfil (RN-ANU-01), que vem de GET /users/me.
export async function getProfileWhatsapp(): Promise<string> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./listings.mock')).getProfileWhatsapp()
  await loadCurrentUser()
  return getCurrentUser().whatsapp
}

// POST /listings (multipart, RN-ANU-01 a 03 e 07): a 1ª imagem vai junto e cada uma das demais em
// POST /listings/:id/images (uma por requisição, até 4 MB). Se uma das extras falhar, o anúncio já
// existe: devolve o anúncio com `failedImages` para a tela avisar, em vez de duplicá-lo numa nova tentativa.
export async function createListing(input: NewListing): Promise<CreatedListing> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./listings.mock')).createListing(input)

  const [first, ...others] = input.images
  if (!first) throw new ApiError(400, 'VALIDATION_ERROR', 'Envie ao menos uma imagem.')

  const form = new FormData()
  form.append('title', input.title)
  form.append('categoryId', String(input.categoryId))
  form.append('description', input.description)
  form.append('priceInCents', String(input.priceInCents))
  form.append('quantity', String(input.quantity))
  if (input.whatsapp) form.append('whatsapp', input.whatsapp)
  form.append('image', first)

  const created = await api<{ data: { id: number; title: string; categoryId: number; categoryName: string } }>(
    '/listings',
    { method: 'POST', body: form },
  )
  const listing = created.data

  let failedImages = 0
  for (const file of others) {
    const extra = new FormData()
    extra.append('image', file)
    try {
      await api(`/listings/${listing.id}/images`, { method: 'POST', body: extra })
    } catch {
      failedImages += 1
    }
  }

  return {
    id: listing.id,
    title: listing.title,
    categoryId: listing.categoryId,
    categoryName: listing.categoryName,
    ...(failedImages > 0 ? { failedImages } : {}),
  }
}

// GET /listings/:id (RF008). null = não existe ou não está visível (404, RN-ANU-05).
export async function getListingById(id: number, signal?: AbortSignal): Promise<ListingDetail | null> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./listings.mock')).getListingById(id, signal)
  try {
    const response = await api<{ data: ApiDetail }>(`/listings/${id}`, { signal })
    return toDetail(response.data)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

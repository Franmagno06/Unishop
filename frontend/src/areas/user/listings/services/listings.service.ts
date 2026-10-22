import { ApiError } from '../../../../shared/lib/api'
import { getCategoryById } from '../../categories/services/categories.service'
import type {
  ContactMode,
  CreatedListing,
  ListingDetail,
  ListingSort,
  ListingsPage,
  NewListing,
} from '../types/listing.types'
import { addExampleListing, exampleListings, nextExampleListingId } from './listings.data'
import { DEMO_STUDENT, exampleDetail, getCreatedDetail, registerCreatedDetail } from './listings.details'

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

// WhatsApp do perfil do aluno de exemplo: o formulário nasce com ele preenchido (RN-ANU-01).
// Quando existir a tela de perfil / GET /users/me, vem de lá.
export async function getProfileWhatsapp(): Promise<string> {
  return '85999990000'
}

// POST /listings (multipart, RN-ANU-01 a 03 e 07). Hoje só guarda em memória: o anúncio novo vai
// para o topo da categoria. Na API real, a 1ª imagem vai em POST /listings e as demais em
// POST /listings/:id/images (uma por requisição, até 4 MB).
export async function createListing(input: NewListing): Promise<CreatedListing> {
  const category = await getCategoryById(input.categoryId)
  if (!category) throw new ApiError(400, 'VALIDATION_ERROR', 'Categoria inválida.')

  const id = nextExampleListingId()
  // Endereços de visualização das fotos escolhidas (a 1ª é a capa do card). Valem até recarregar.
  const images =
    typeof URL.createObjectURL === 'function' ? input.images.map((file) => URL.createObjectURL(file)) : []
  addExampleListing({
    id,
    title: input.title,
    priceInCents: input.priceInCents,
    categoryId: input.categoryId,
    contact: { mode: 'whatsapp' },
    imageUrl: images[0] ?? null,
    publishedAt: new Date().toISOString(),
  })
  registerCreatedDetail({
    id,
    title: input.title,
    priceInCents: input.priceInCents,
    description: input.description,
    quantity: input.quantity,
    categoryId: input.categoryId,
    images,
    seller: DEMO_STUDENT,
    isOwn: true,
  })
  return { id, title: input.title, categoryId: category.id, categoryName: category.name }
}

// GET /listings/:id (RF008). Dados de exemplo. null = não existe ou não está visível (RN-ANU-05).
export async function getListingById(id: number, signal?: AbortSignal): Promise<ListingDetail | null> {
  signal?.throwIfAborted()
  const created = getCreatedDetail(id)
  if (created) return created
  const summary = exampleListings.find((listing) => listing.id === id)
  return summary ? exampleDetail(summary) : null
}

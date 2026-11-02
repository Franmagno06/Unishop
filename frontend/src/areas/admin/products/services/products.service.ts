import { ApiError, api } from '../../../../shared/lib/api'
import { MOCK_MODE } from '../../../../shared/lib/mock-mode'
import { toPage, type ApiPage } from '../../shared/services/admin-api'
import type { Page } from '../../shared/types'
import type {
  AdminCategory,
  AdminProduct,
  ProductListQuery,
  ProductStats,
  UpdateProductInput,
} from '../types/product.types'

// Rotas do backend.md §9: GET /admin/listings (+ /stats), GET, PATCH e DELETE /admin/listings/:id.
// Em modo de demonstração (MOCK_MODE) as chamadas vão para `products.mock.ts`; o `import.meta.env.DEV`
// escrito aqui é o que deixa o Vite apagar o código de exemplo do build.
export const PRODUCTS_PAGE_SIZE = 6 // as 6 linhas do Figma (A03)

type ApiRow = {
  id: number
  title: string
  priceInCents: number
  categoryId: number
  categoryName: string
  status: AdminProduct['status']
  imageUrl: string | null
  seller: { id: number; name: string }
  publishedAt: string
}

type ApiDetail = Omit<ApiRow, 'imageUrl' | 'seller'> & {
  description: string
  whatsapp: string
  seller: { id: number; name: string; email: string; whatsapp: string | null }
  images: { id: number; url: string }[]
  views: number
  whatsappContacts: number
}

// A lista da API não traz descrição, e-mail do vendedor nem contadores: a tabela mostra só o que vem
// (título, categoria, preço, vendedor, status). O detalhe traz o resto.
const fromRow = (item: ApiRow): AdminProduct => ({
  id: item.id,
  title: item.title,
  description: '',
  priceInCents: item.priceInCents,
  categoryId: item.categoryId,
  categoryName: item.categoryName,
  status: item.status,
  whatsapp: '',
  seller: { id: item.seller.id, name: item.seller.name, email: '', whatsapp: '' },
  images: item.imageUrl ? [{ id: 0, url: item.imageUrl }] : [],
  views: 0,
  whatsappContacts: 0,
  publishedAt: item.publishedAt,
})

const fromDetail = (item: ApiDetail): AdminProduct => ({
  id: item.id,
  title: item.title,
  description: item.description,
  priceInCents: item.priceInCents,
  categoryId: item.categoryId,
  categoryName: item.categoryName,
  status: item.status,
  whatsapp: item.whatsapp,
  seller: {
    id: item.seller.id,
    name: item.seller.name,
    email: item.seller.email,
    whatsapp: item.seller.whatsapp ?? '',
  },
  images: item.images.map((image) => ({ id: image.id, url: image.url })),
  views: item.views,
  whatsappContacts: item.whatsappContacts,
  publishedAt: item.publishedAt,
})

// Filtro da lista: GET /categories (o admin também pode listar).
export async function getCategories(): Promise<AdminCategory[]> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./products.mock')).getCategories()
  const { data } = await api<{ data: { id: number; name: string }[] }>('/categories')
  return data.map(({ id, name }) => ({ id, name }))
}

// RN-ADM-07: ativos, pausados e vendidos no mês.
export async function getProductStats(signal?: AbortSignal): Promise<ProductStats> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./products.mock')).getProductStats(signal)
  return (await api<{ data: ProductStats }>('/admin/listings/stats', { signal })).data
}

// RF022 · RN-ADM-07: busca por nome do produto ou do vendedor, filtro por categoria e paginação.
export async function listProducts(
  query: ProductListQuery,
  signal?: AbortSignal,
): Promise<Page<AdminProduct>> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./products.mock')).listProducts(query, signal)
  const params = new URLSearchParams({ page: String(query.page), limit: String(PRODUCTS_PAGE_SIZE) })
  const term = query.search.trim()
  if (term) params.set('search', term)
  if (query.categoryId !== null) params.set('category', String(query.categoryId))
  const response = await api<ApiPage<ApiRow>>(`/admin/listings?${params}`, { signal })
  return toPage(response, fromRow)
}

// RF023. null = não existe ou foi excluído.
export async function getProductDetail(id: number, signal?: AbortSignal): Promise<AdminProduct | null> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./products.mock')).getProductDetail(id, signal)
  try {
    return fromDetail((await api<{ data: ApiDetail }>(`/admin/listings/${id}`, { signal })).data)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

// RF024 · RN-ADM-08: o admin altera só o status do anúncio (Ativo ou Pausado; reverte Vendido).
export async function updateProduct(id: number, input: UpdateProductInput): Promise<AdminProduct> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./products.mock')).updateProduct(id, input)
  const { data } = await api<{ data: ApiDetail }>(`/admin/listings/${id}`, {
    method: 'PATCH',
    body: { status: input.status },
  })
  return fromDetail(data)
}

// RF023.6 e 23.7 · RN-ADM-09: remove o anúncio e o servidor avisa o vendedor por e-mail (RN-NOT-02).
// Bloqueada (409 HAS_OPEN_PAID_ORDERS) enquanto houver pedido Pago ou em Retirada combinada em aberto.
export async function deleteProduct(id: number): Promise<void> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./products.mock')).deleteProduct(id)
  await api<void>(`/admin/listings/${id}`, { method: 'DELETE' })
}

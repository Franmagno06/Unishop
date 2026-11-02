import { ApiError } from '../../../../shared/lib/api'
import { DAY, DEMO_NOW, normalize, paginate, wait } from '../../shared/services/mock-utils'
import type { Page } from '../../shared/types'
import type {
  AdminCategory,
  AdminProduct,
  ProductListQuery,
  ProductStats,
  UpdateProductInput,
} from '../types/product.types'
import {
  CATEGORIES,
  findProduct,
  getAllProducts,
  markProductDeleted,
  PRODUCTS_WITH_OPEN_PAID_ORDERS,
  saveProduct,
} from './products.data'

// Formato assumido das rotas do backend.md §9 (GET /admin/listings, GET e PATCH /admin/listings/:id,
// DELETE /admin/listings/:id); o openapi.yaml ainda não existe. Quando a API chegar, só este
// arquivo muda.
export const PRODUCTS_PAGE_SIZE = 6 // as 6 linhas do Figma (A03)

const notFound = () => new ApiError(404, 'NOT_FOUND', 'Produto não encontrado.')

export async function getCategories(): Promise<AdminCategory[]> {
  await wait(0)
  return CATEGORIES
}

// RN-ADM-07: ativos, pausados e vendidos no mês. "No mês" = nos últimos 30 dias (a regra não diz
// se é mês de calendário).
export async function getProductStats(signal?: AbortSignal): Promise<ProductStats> {
  await wait()
  signal?.throwIfAborted()
  const all = getAllProducts()
  return {
    active: all.filter((product) => product.status === 'active').length,
    paused: all.filter((product) => product.status === 'paused').length,
    soldInMonth: all.filter(
      (product) => product.status === 'sold' && Date.parse(product.publishedAt) >= DEMO_NOW - 30 * DAY,
    ).length,
  }
}

// RF022: busca por nome do produto ou do vendedor, filtro por categoria e paginação.
export async function listProducts(
  { search, categoryId, page }: ProductListQuery,
  signal?: AbortSignal,
): Promise<Page<AdminProduct>> {
  await wait()
  signal?.throwIfAborted()
  const term = normalize(search)
  const rows = getAllProducts()
    .filter(
      (product) =>
        !term || normalize(product.title).includes(term) || normalize(product.seller.name).includes(term),
    )
    .filter((product) => categoryId === null || product.categoryId === categoryId)
  return paginate(rows, page, PRODUCTS_PAGE_SIZE)
}

// RF023. null = não existe ou foi excluído.
export async function getProductDetail(id: number, signal?: AbortSignal): Promise<AdminProduct | null> {
  await wait()
  signal?.throwIfAborted()
  return findProduct(id) ?? null
}

// RF024 · RN-ADM-08 (simplificado em 26/10/2026): o admin altera só o status do anúncio.
export async function updateProduct(id: number, { status }: UpdateProductInput): Promise<AdminProduct> {
  await wait()
  const product = findProduct(id)
  if (!product) throw notFound()
  const changed: AdminProduct = { ...product, status }
  saveProduct(changed)
  return changed
}

// RF023.6 e 23.7 · RN-ADM-09: remove o anúncio e avisa o vendedor por e-mail (RN-NOT-02).
// Bloqueada enquanto houver pedido Pago ou em Retirada combinada em aberto.
export async function deleteProduct(id: number): Promise<void> {
  await wait()
  if (!findProduct(id)) throw notFound()
  if (PRODUCTS_WITH_OPEN_PAID_ORDERS.has(id)) {
    throw new ApiError(
      409,
      'HAS_OPEN_PAID_ORDERS',
      'Há pedido pago ou com retirada combinada em aberto.',
    )
  }
  markProductDeleted(id)
}

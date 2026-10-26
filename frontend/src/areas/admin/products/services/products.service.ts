import { ApiError } from '../../../../shared/lib/api'
import { DAY, DEMO_NOW, normalize, paginate, wait } from '../../shared/services/mock-utils'
import type { Page } from '../../shared/types'
import { getAllUsers } from '../../users/services/users.data'
import type {
  AdminCategory,
  AdminProduct,
  ProductListQuery,
  ProductStats,
  SellerOption,
  UpdateProductInput,
} from '../types/product.types'
import {
  CATEGORIES,
  findProduct,
  getAllProducts,
  markProductDeleted,
  PRODUCTS_WITH_OPEN_ORDERS,
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

// Vendedores para o campo "Vendedor responsável" (RN-ADM-08): só contas ativas, no máximo 8.
export async function searchSellers(search: string, signal?: AbortSignal): Promise<SellerOption[]> {
  await wait(150)
  signal?.throwIfAborted()
  const term = normalize(search)
  return getAllUsers()
    .filter((user) => user.status === 'active')
    .filter((user) => !term || normalize(user.name).includes(term) || normalize(user.email).includes(term))
    .slice(0, 8)
    .map(({ id, name, email }) => ({ id, name, email }))
}

// RF024 · RN-ADM-08: edita o produto, inclusive o vendedor e o status (o admin reverte Vendido).
// Trocar o vendedor com pedido aberto é recusado, porque o pedido guarda o vendedor.
export async function updateProduct(id: number, input: UpdateProductInput): Promise<AdminProduct> {
  await wait()
  const product = findProduct(id)
  if (!product) throw notFound()

  let seller = product.seller
  if (input.sellerId !== product.seller.id) {
    if (PRODUCTS_WITH_OPEN_ORDERS.has(id)) {
      throw new ApiError(409, 'HAS_OPEN_ORDERS', 'Há pedido aberto neste produto.')
    }
    const next = getAllUsers().find((user) => user.id === input.sellerId)
    if (!next || next.status !== 'active') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Escolha um vendedor com conta ativa.')
    }
    seller = { id: next.id, name: next.name, email: next.email, whatsapp: next.whatsapp }
  }

  const category = CATEGORIES.find((item) => item.id === input.categoryId)
  if (!category) throw new ApiError(400, 'VALIDATION_ERROR', 'Categoria inválida.')

  const changed: AdminProduct = {
    ...product,
    title: input.title.trim(),
    description: input.description.trim(),
    priceInCents: input.priceInCents,
    categoryId: category.id,
    categoryName: category.name,
    status: input.status,
    whatsapp: input.whatsapp,
    seller,
    images:
      input.imageUrl === undefined
        ? product.images
        : [{ id: product.images[0]?.id ?? product.id * 10, url: input.imageUrl }, ...product.images.slice(1)],
  }
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

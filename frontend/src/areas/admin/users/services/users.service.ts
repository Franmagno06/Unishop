import { ApiError } from '../../../../shared/lib/api'
import { getAllProducts } from '../../products/services/products.data'
import { DAY, DEMO_NOW, normalize, paginate, wait } from '../../shared/services/mock-utils'
import type { Page } from '../../shared/types'
import type {
  AdminUser,
  AdminUserDetail,
  AdminUserRow,
  UpdateUserInput,
  UserListQuery,
  UserStats,
} from '../types/user.types'
import {
  findUser,
  getAllUsers,
  markUserDeleted,
  saveUser,
  USERS_WITH_OPEN_PAID_ORDERS,
} from './users.data'

// Formato assumido das rotas do backend.md §9 (GET /admin/users, GET e PATCH /admin/users/:id,
// DELETE /admin/users/:id); o openapi.yaml ainda não existe. Quando a API chegar, só este arquivo muda.
export const USERS_PAGE_SIZE = 7 // as 7 linhas do Figma (A01)

const notFound = () => new ApiError(404, 'NOT_FOUND', 'Usuário não encontrado.')

function listingsCountByUser(): Map<number, number> {
  const counts = new Map<number, number>()
  for (const product of getAllProducts()) {
    counts.set(product.seller.id, (counts.get(product.seller.id) ?? 0) + 1)
  }
  return counts
}

// RN-ADM-02: os indicadores contam só alunos com conta ativa ou suspensa; "logado agora" só ativas.
export async function getUserStats(signal?: AbortSignal): Promise<UserStats> {
  await wait()
  signal?.throwIfAborted()
  const all = getAllUsers()
  return {
    total: all.length,
    online: all.filter((user) => user.status === 'active' && user.isOnline).length,
    newThisWeek: all.filter((user) => Date.parse(user.createdAt) >= DEMO_NOW - 7 * DAY).length,
  }
}

// RF019: busca por nome ou e-mail, filtro "Todos / Logados agora / Offline" e paginação.
export async function listUsers(
  { search, presence, page }: UserListQuery,
  signal?: AbortSignal,
): Promise<Page<AdminUserRow>> {
  await wait()
  signal?.throwIfAborted()
  const term = normalize(search)
  const counts = listingsCountByUser()
  const rows = getAllUsers()
    .filter((user) => !term || normalize(user.name).includes(term) || normalize(user.email).includes(term))
    .filter((user) => presence === 'all' || (presence === 'online') === user.isOnline)
    .map((user) => ({ ...user, listingsCount: counts.get(user.id) ?? 0 }))
  return paginate(rows, page, USERS_PAGE_SIZE)
}

// RF020: o aluno, os três indicadores e os anúncios dele. null = não existe ou foi excluído.
export async function getUserDetail(id: number, signal?: AbortSignal): Promise<AdminUserDetail | null> {
  await wait()
  signal?.throwIfAborted()
  const user = findUser(id)
  if (!user) return null
  const listings = getAllProducts().filter((product) => product.seller.id === id)
  return {
    user,
    listings: listings.map((product) => ({
      id: product.id,
      title: product.title,
      priceInCents: product.priceInCents,
      categoryName: product.categoryName,
      status: product.status,
      imageUrl: product.images[0]?.url ?? null,
    })),
    stats: {
      listings: listings.length,
      sales: listings.filter((product) => product.status === 'sold').length,
      // Não há pedidos de exemplo por aluno; o número vem do cadastro fictício.
      purchases: id % 4,
    },
  }
}

// RF021 · RN-ADM-04 e 05: edita os dados e suspende ou reativa a conta.
export async function updateUser(id: number, input: UpdateUserInput): Promise<AdminUser> {
  await wait()
  const user = findUser(id)
  if (!user) throw notFound()
  const email = input.email.trim().toLowerCase()
  if (getAllUsers().some((other) => other.id !== id && other.email === email)) {
    throw new ApiError(409, 'EMAIL_ALREADY_REGISTERED', 'Este e-mail já está cadastrado.')
  }
  const changed: AdminUser = {
    ...user,
    name: input.name.trim(),
    email,
    course: input.course.trim(),
    whatsapp: input.whatsapp,
    status: input.status,
    avatarUrl: input.avatarUrl === undefined ? user.avatarUrl : input.avatarUrl,
    // Conta suspensa não aparece como logada (RN-ADM-02).
    isOnline: input.status === 'active' ? user.isOnline : false,
  }
  saveUser(changed)
  return changed
}

// RF020.6 e 20.7 · RN-ADM-06: excluir anonimiza a conta e tira os anúncios do ar. Bloqueada
// enquanto houver pedido Pago ou em Retirada combinada em aberto.
export async function deleteUser(id: number): Promise<void> {
  await wait()
  if (!findUser(id)) throw notFound()
  if (USERS_WITH_OPEN_PAID_ORDERS.has(id)) {
    throw new ApiError(
      409,
      'HAS_OPEN_PAID_ORDERS',
      'Há pedido pago ou com retirada combinada em aberto.',
    )
  }
  markUserDeleted(id)
}

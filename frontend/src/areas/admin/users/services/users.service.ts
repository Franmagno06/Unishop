import { ApiError, api } from '../../../../shared/lib/api'
import { MOCK_MODE } from '../../../../shared/lib/mock-mode'
import { toPage, type ApiPage } from '../../shared/services/admin-api'
import type { Page } from '../../shared/types'
import type {
  AdminUser,
  AdminUserDetail,
  AdminUserRow,
  UpdateUserInput,
  UserListQuery,
  UserStats,
} from '../types/user.types'

// Rotas do backend.md §9: GET /admin/users (+ /stats), GET, PATCH e DELETE /admin/users/:id. Em modo
// de demonstração (MOCK_MODE) as chamadas vão para `users.mock.ts`; o `import.meta.env.DEV` escrito
// aqui é o que deixa o Vite apagar o código de exemplo do build.
export const USERS_PAGE_SIZE = 7 // as 7 linhas do Figma (A01)

// Formato da API: curso, WhatsApp e último acesso podem vir nulos (conta nova, Google sem perfil).
type ApiUser = Omit<AdminUser, 'course' | 'whatsapp'> & {
  course: string | null
  whatsapp: string | null
}

// Quem nunca acessou vem com lastAccessAt nulo (a tela mostra "Nunca acessou").
const toUser = (item: ApiUser): AdminUser => ({
  id: item.id,
  name: item.name,
  email: item.email,
  course: item.course ?? '',
  whatsapp: item.whatsapp ?? '',
  avatarUrl: item.avatarUrl,
  status: item.status,
  createdAt: item.createdAt,
  lastAccessAt: item.lastAccessAt,
  isOnline: item.isOnline,
})

const toRow = (item: ApiUser & { listingsCount: number }): AdminUserRow => ({
  ...toUser(item),
  listingsCount: item.listingsCount,
})

// RN-ADM-02: os indicadores contam só alunos com conta ativa ou suspensa; "logado agora" só ativas.
export async function getUserStats(signal?: AbortSignal): Promise<UserStats> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./users.mock')).getUserStats(signal)
  return (await api<{ data: UserStats }>('/admin/users/stats', { signal })).data
}

// RF019 · RN-ADM-02, 03: busca por nome ou e-mail, filtro de presença e paginação.
export async function listUsers(
  query: UserListQuery,
  signal?: AbortSignal,
): Promise<Page<AdminUserRow>> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./users.mock')).listUsers(query, signal)
  const params = new URLSearchParams({ page: String(query.page), limit: String(USERS_PAGE_SIZE) })
  const term = query.search.trim()
  if (term) params.set('search', term)
  params.set('presence', query.presence)
  const response = await api<ApiPage<ApiUser & { listingsCount: number }>>(
    `/admin/users?${params}`,
    { signal },
  )
  return toPage(response, toRow)
}

// RF020 · RN-ADM-04: o aluno, os três indicadores e os anúncios dele. null = não existe ou foi excluído.
export async function getUserDetail(id: number, signal?: AbortSignal): Promise<AdminUserDetail | null> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./users.mock')).getUserDetail(id, signal)
  try {
    const { data } = await api<{ data: Omit<AdminUserDetail, 'user'> & { user: ApiUser } }>(
      `/admin/users/${id}`,
      { signal },
    )
    return { ...data, user: toUser(data.user) }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

// RF021 · RN-ADM-05: o admin edita só o status da conta (Ativa ou Suspensa).
export async function updateUser(id: number, input: UpdateUserInput): Promise<AdminUser> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./users.mock')).updateUser(id, input)
  const { data } = await api<{ data: ApiUser }>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: { status: input.status },
  })
  return toUser(data)
}

// RF020.6 e 20.7 · RN-ADM-06: excluir anonimiza a conta. Bloqueada (409 HAS_OPEN_PAID_ORDERS)
// enquanto houver pedido Pago ou em Retirada combinada em aberto.
export async function deleteUser(id: number): Promise<void> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./users.mock')).deleteUser(id)
  await api<void>(`/admin/users/${id}`, { method: 'DELETE' })
}

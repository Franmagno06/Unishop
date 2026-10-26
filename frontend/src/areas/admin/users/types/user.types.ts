import type { ListingStatus } from '../../shared/types'

// Conta do aluno (banco `usuario.status_conta`): `ativa`, `suspensa` (pelo admin) e `excluida`
// (anonimizada, some do painel). Na tela: "Ativa" é `active` e "Suspensa" é `suspended` (RN-ADM-05).
export type AccountStatus = 'active' | 'suspended'

// Aluno na visão do admin, formato assumido de GET /admin/users/:id (backend.md §9).
export type AdminUser = {
  id: number
  name: string
  email: string
  course: string
  whatsapp: string // só dígitos (RN-PER-07)
  avatarUrl: string | null
  status: AccountStatus
  createdAt: string // ISO (UTC)
  lastAccessAt: string // ISO (UTC)
  // "Logado agora": atividade nos últimos 5 minutos (RN-ADM-03). Quem decide é o servidor.
  isOnline: boolean
}

// Linha da lista (A01): o usuário e a contagem de anúncios.
export type AdminUserRow = AdminUser & { listingsCount: number }

export type UserStats = {
  total: number // alunos ativos ou suspensos (RN-ADM-02)
  online: number
  newThisWeek: number
}

export type UserPresenceFilter = 'all' | 'online' | 'offline'

export type UserListQuery = {
  search: string
  presence: UserPresenceFilter
  page: number
}

export type UserListingSummary = {
  id: number
  title: string
  priceInCents: number
  categoryName: string
  status: ListingStatus
  imageUrl: string | null
}

// Tela de detalhes (A02): o aluno, os três indicadores e os anúncios dele.
export type AdminUserDetail = {
  user: AdminUser
  listings: UserListingSummary[]
  stats: { listings: number; sales: number; purchases: number }
}

// O admin edita só o status da conta (decisão de 26/10/2026): Ativa ou Suspensa.
export type UpdateUserInput = { status: AccountStatus }

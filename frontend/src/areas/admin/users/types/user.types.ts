import type { ListingStatus } from '../../shared/types'

// Conta do aluno (banco `usuario.status_conta`): `excluida` é anonimizada e some do painel.
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

// Campos editáveis pelo admin (RN-ADM-04 e 05). `avatarUrl: undefined` mantém a foto atual.
export type UpdateUserInput = {
  name: string
  email: string
  course: string
  whatsapp: string
  status: AccountStatus
  avatarUrl?: string | null
}

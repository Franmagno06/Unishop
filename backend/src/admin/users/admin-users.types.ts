import type { AccountStatus } from '../../modules/auth/auth.types'
import type { ListingStatus } from '../../modules/listings/listings.types'
import type { AuditEntry } from '../audit-logs/audit-logs.types'
import type { Pagination } from '../../shared/utils/pagination'

// O que o repository devolve (sem o cálculo de "logado agora", que é regra do service).
export type AdminUserRecord = {
  id: number
  name: string
  email: string
  course: string | null
  whatsapp: string | null
  avatarUrl: string | null
  role: 'student' | 'admin'
  status: Exclude<AccountStatus, 'deleted'>
  createdAt: Date
  lastAccessAt: Date | null
}
export type AdminUserRowRecord = AdminUserRecord & { listingsCount: number } // anúncios não excluídos
export type AdminUserDetailRecord = {
  user: AdminUserRecord
  listings: {
    id: number
    title: string
    priceInCents: number
    categoryName: string
    status: ListingStatus
    imageUrl: string | null
  }[]
  stats: { listings: number; sales: number; purchases: number } // vendas/compras = pedidos concluídos (Q3)
}
export type UserStats = { total: number; online: number; newThisWeek: number }

export type AdminUserView = AdminUserRecord & { isOnline: boolean }
export type AdminUserRow = AdminUserView & { listingsCount: number }
export type AdminUserDetail = Omit<AdminUserDetailRecord, 'user'> & { user: AdminUserView }

// Estado do alvo lido com a linha travada (FOR UPDATE), para a regra decidir sem corrida.
export type TargetSnapshot = {
  id: number
  role: 'student' | 'admin'
  status: 'active' | 'suspended'
  activeAdminIds: number[]
}

export interface AdminUsersRepository {
  listStudents(
    filters: { search?: string | undefined },
    pagination: Pagination,
  ): Promise<{ items: AdminUserRowRecord[]; total: number }>
  stats(onlineSince: Date, weekAgo: Date): Promise<UserStats>
  /** null se não existe ou está excluída. */
  findDetail(id: number): Promise<AdminUserDetailRecord | null>
  /**
   * RN-ADM-05, 10, 12: numa transação só, trava os admins ativos e o alvo, chama `guard` (pode lançar),
   * muda o status e grava o log. 'not_found' se a conta não existe ou está excluída.
   */
  changeStatus(
    targetId: number,
    to: 'active' | 'suspended',
    hooks: { guard: (s: TargetSnapshot) => void; audit: (s: TargetSnapshot) => AuditEntry },
  ): Promise<'not_found' | AdminUserRecord>
}

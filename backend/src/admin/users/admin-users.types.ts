import type { AccountStatus } from '../../modules/auth/auth.types'
import type { ListingStatus } from '../../modules/listings/listings.types'
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

export interface AdminUsersRepository {
  listStudents(
    filters: { search?: string | undefined },
    pagination: Pagination,
  ): Promise<{ items: AdminUserRowRecord[]; total: number }>
  stats(onlineSince: Date, weekAgo: Date): Promise<UserStats>
  /** null se não existe ou está excluída. */
  findDetail(id: number): Promise<AdminUserDetailRecord | null>
}

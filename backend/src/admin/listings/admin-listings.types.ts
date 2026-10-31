import type { ListingStatus } from '../../modules/listings/listings.types'
import type { Pagination } from '../../shared/utils/pagination'
import type { AuditEntry } from '../audit-logs/audit-logs.types'

export type AdminListingRow = {
  id: number
  title: string
  priceInCents: number
  categoryId: number
  categoryName: string
  status: ListingStatus
  imageUrl: string | null
  seller: { id: number; name: string }
  publishedAt: Date
}
export type AdminListingDetail = {
  id: number
  title: string
  description: string
  priceInCents: number
  quantity: number
  categoryId: number
  categoryName: string
  status: ListingStatus
  whatsapp: string
  seller: { id: number; name: string; email: string; whatsapp: string | null }
  images: { id: number; url: string; position: number }[]
  views: number
  whatsappContacts: number
  publishedAt: Date
}
export type ListingStats = { active: number; paused: number; soldInMonth: number }

export type AdminListingFilters = { search?: string | undefined; categoryId?: number | undefined }

// Estado do anúncio lido com a linha travada (FOR UPDATE).
export type ListingSnapshot = { id: number; status: ListingStatus; quantity: number }

export interface AdminListingsRepository {
  /** Só anúncios não excluídos (Q4), inclusive de dono suspenso. */
  list(
    filters: AdminListingFilters,
    pagination: Pagination,
  ): Promise<{ items: AdminListingRow[]; total: number }>
  stats(monthStart: Date): Promise<ListingStats>
  /** null se não existe ou está excluído. */
  findDetail(id: number): Promise<AdminListingDetail | null>
  /**
   * RN-ADM-09, 10: transação única: pedidos, depois o anúncio (nessa ordem); 'blocked' com pedido pago ou
   * com retirada combinada; cancela Pendente e Em negociação; marca excluido_em e grava o log.
   * Devolve o vendedor e o título para o aviso por e-mail (enviado depois do commit).
   */
  softDelete(
    id: number,
    hooks: {
      guardActor: (activeAdminIds: number[]) => void
      audit: (r: { cancelledOrderIds: number[] }) => AuditEntry
    },
  ): Promise<'not_found' | 'blocked' | { seller: { name: string; email: string }; title: string }>
  /**
   * RN-ADM-08, 10: trava o anúncio, chama `guard` (pode lançar e diz se limpa `vendido_em`), troca o
   * status e grava o log na mesma transação.
   */
  changeStatus(
    id: number,
    to: 'active' | 'paused',
    hooks: {
      guardActor: (activeAdminIds: number[]) => void
      guard: (s: ListingSnapshot) => { clearSoldAt: boolean }
      audit: (s: ListingSnapshot) => AuditEntry
    },
  ): Promise<'not_found' | AdminListingDetail>
}

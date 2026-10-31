import type { Prisma } from '../../generated/prisma/client'
import type { Pagination } from '../../shared/utils/pagination'

// API e código em inglês; o repository converte para os valores do bd.md §4.7 (acao) e §6 (entidade).
export const AUDIT_ACTIONS = [
  'suspend_user', // suspender_usuario
  'reactivate_user', // reativar_usuario
  'delete_user', // excluir_usuario
  'edit_listing', // editar_anuncio (Ativo <-> Pausado)
  'revert_sold', // reverter_vendido
  'delete_listing', // excluir_anuncio
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]
export type AuditEntity = 'user' | 'listing' // usuario | anuncio

export type AuditDetails = Prisma.InputJsonValue
export type AuditEntry = {
  adminId: number
  action: AuditAction
  entity: AuditEntity
  entityId: number
  details: AuditDetails
}
/** Grava UMA linha de auditoria dentro da transação de quem chama (RN-ADM-10). */
export type AuditWriter = (tx: Prisma.TransactionClient, entry: AuditEntry) => Promise<void>

export type AuditLogFilters = {
  adminId?: number | undefined
  action?: AuditAction | undefined
  from?: Date | undefined
  to?: Date | undefined
}
export type AuditLogView = {
  id: number
  admin: { id: number; name: string }
  /** Ação da API; se o banco tiver um valor sem equivalente, vem o texto bruto do banco. */
  action: AuditAction | (string & {})
  target: { type: AuditEntity | (string & {}); id: number }
  at: Date
  changes: unknown
}
export interface AuditLogRepository {
  list(
    filters: AuditLogFilters,
    pagination: Pagination,
  ): Promise<{ items: AuditLogView[]; total: number }>
}

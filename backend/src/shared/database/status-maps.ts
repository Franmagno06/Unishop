import type { AccountStatus } from '../../modules/auth/auth.types'
import type { CancelReason, OrderStatus } from '../../modules/orders/orders.types'
import type { ListingStatus } from '../../modules/listings/listings.types'
import type { UserRole } from '../types/express'

// O banco guarda os valores em português (bd.md §7); o código e a API usam inglês.
export const ROLE_FROM_DB: Record<string, UserRole> = { aluno: 'student', admin: 'admin' }
export const ROLE_TO_DB: Record<UserRole, string> = { student: 'aluno', admin: 'admin' }

export const ACCOUNT_STATUS_FROM_DB: Record<string, AccountStatus> = {
  ativa: 'active',
  suspensa: 'suspended',
  excluida: 'deleted',
}
export const ACCOUNT_STATUS_TO_DB: Record<AccountStatus, string> = {
  active: 'ativa',
  suspended: 'suspensa',
  deleted: 'excluida',
}

export const LISTING_STATUS_FROM_DB: Record<string, ListingStatus> = {
  ativo: 'active',
  pausado: 'paused',
  vendido: 'sold',
}
export const ORDER_STATUS_FROM_DB: Record<string, OrderStatus> = {
  pendente: 'pending',
  pago: 'paid',
  retirada_combinada: 'pickup_arranged',
  concluido: 'completed',
  em_negociacao: 'negotiating',
  cancelado: 'cancelled',
}
export const ORDER_STATUS_TO_DB = Object.fromEntries(
  Object.entries(ORDER_STATUS_FROM_DB).map(([db, api]) => [api, db]),
) as Record<OrderStatus, string>

// Único mapa de motivos de cancelamento (CHECK ck_pedido_motivo_cancelamento, migração 3).
export const CANCEL_REASON_FROM_DB: Record<string, CancelReason> = {
  vencido: 'expired',
  sem_estoque: 'out_of_stock',
  anuncio_indisponivel: 'listing_unavailable',
}
export const CANCEL_REASON_TO_DB: Record<CancelReason, string> = {
  expired: 'vencido',
  out_of_stock: 'sem_estoque',
  listing_unavailable: 'anuncio_indisponivel',
}

export const LISTING_STATUS_TO_DB: Record<ListingStatus, string> = {
  active: 'ativo',
  paused: 'pausado',
  sold: 'vendido',
}

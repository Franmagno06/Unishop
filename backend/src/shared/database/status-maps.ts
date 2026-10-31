import type { AccountStatus } from '../../modules/auth/auth.types'
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
export const LISTING_STATUS_TO_DB: Record<ListingStatus, string> = {
  active: 'ativo',
  paused: 'pausado',
  sold: 'vendido',
}

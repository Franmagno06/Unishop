import { AppError } from '../../shared/errors/app-error'
import type { ListingStatus } from './listings.types'

// Transições do anúncio feitas pelo dono (backend.md §12). Vendido é final para o dono: só o admin
// reverte, na área admin (RN-ANU-04). Excluir não é estado: é `excluido_em`.
export type ListingAction = 'pause' | 'reactivate' | 'mark-sold'

const TRANSITIONS: Record<ListingAction, { from: ListingStatus[]; to: ListingStatus }> = {
  pause: { from: ['active'], to: 'paused' },
  reactivate: { from: ['paused'], to: 'active' },
  'mark-sold': { from: ['active', 'paused'], to: 'sold' }, // RF017.9
}

const MESSAGES: Record<ListingAction, string> = {
  pause: 'Só um anúncio ativo pode ser pausado.',
  reactivate: 'Só um anúncio pausado pode ser reativado.',
  'mark-sold': 'Este anúncio já foi vendido.',
}

export function assertCanTransition(action: ListingAction, current: ListingStatus) {
  const { from, to } = TRANSITIONS[action]
  if (!from.includes(current)) throw new AppError(409, 'INVALID_STATE', MESSAGES[action])
  return { from, to }
}

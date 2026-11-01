import type { AuditAction, AuditDetails } from './audit-logs.types'

export type AuditChange =
  | { kind: 'status'; from: string; to: string } // suspend_user, reactivate_user, edit_listing, revert_sold
  | { kind: 'delete'; cancelledOrderIds: number[]; deletedListings?: number } // delete_user, delete_listing

// RN-ADM-10, backend.md §18: "campos alterados, sem dados sensíveis". Decisão 3, opção (b): campos e
// valores da API em inglês; exclusão guarda só ids e contagens, nunca nome, e-mail ou WhatsApp.
export function buildAuditDetails(_action: AuditAction, change: AuditChange): AuditDetails {
  if (change.kind === 'status') return { status: { from: change.from, to: change.to } }
  return {
    cancelledOrderIds: change.cancelledOrderIds,
    ...(change.deletedListings !== undefined && { deletedListings: change.deletedListings }),
  }
}

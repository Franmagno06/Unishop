import type { AuditAction, AuditDetails } from './audit-logs.types'

export type AuditChange =
  | { kind: 'status'; from: string; to: string } // suspend_user, reactivate_user, edit_listing, revert_sold
  | { kind: 'delete'; cancelledOrderIds: number[]; deletedListings?: number } // delete_user, delete_listing

// RN-ADM-10, backend.md §18: "campos alterados, sem dados sensíveis".
export function buildAuditDetails(action: AuditAction, change: AuditChange): AuditDetails {
  // TODO(human): Decisão 3
  void action
  void change
  throw new Error('TODO(human): Decisão 3')
}

import { describe, expect, it } from 'vitest'
import { buildAuditDetails } from '../../src/admin/audit-logs/audit-logs.details'
import { AUDIT_ACTIONS } from '../../src/admin/audit-logs/audit-logs.types'

describe('buildAuditDetails', () => {
  it('RN-ADM-10: suspensão registra o status anterior e o novo', () => {
    expect(
      buildAuditDetails('suspend_user', { kind: 'status', from: 'active', to: 'suspended' }),
    ).toEqual({ status: { from: 'active', to: 'suspended' } })
  })

  it('RN-ADM-10: reversão de vendido registra from: sold', () => {
    expect(
      buildAuditDetails('revert_sold', { kind: 'status', from: 'sold', to: 'paused' }),
    ).toEqual({ status: { from: 'sold', to: 'paused' } })
  })

  it('RN-ADM-10: exclusão registra só ids e contagens', () => {
    expect(
      buildAuditDetails('delete_user', {
        kind: 'delete',
        cancelledOrderIds: [3, 7],
        deletedListings: 2,
      }),
    ).toEqual({ cancelledOrderIds: [3, 7], deletedListings: 2 })
    expect(buildAuditDetails('delete_listing', { kind: 'delete', cancelledOrderIds: [] })).toEqual({
      cancelledOrderIds: [],
    })
  })

  it('RN-ADM-10: detalhes nunca contêm e-mail, WhatsApp, senha ou token', () => {
    const samples = AUDIT_ACTIONS.flatMap((action) => [
      buildAuditDetails(action, { kind: 'status', from: 'active', to: 'paused' }),
      buildAuditDetails(action, { kind: 'delete', cancelledOrderIds: [1, 22], deletedListings: 3 }),
    ])
    for (const d of samples) {
      const json = JSON.stringify(d)
      expect(json).not.toMatch(/@/)
      expect(json).not.toMatch(/\d{10,11}/)
      expect(json).not.toMatch(/"(email|whatsapp|password|token)"/i)
    }
  })
})

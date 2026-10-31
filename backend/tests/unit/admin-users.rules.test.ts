import { describe, expect, it } from 'vitest'
import { assertAdminProtection, isOnline } from '../../src/admin/users/admin-users.rules'

const now = new Date('2026-10-31T12:00:00.000Z')
const ago = (ms: number) => new Date(now.getTime() - ms)

describe('isOnline', () => {
  it('RN-ADM-03: exatamente 5 minutos ainda conta como logado', () => {
    expect(isOnline(ago(5 * 60_000), 'active', now)).toBe(true)
  })
  it('RN-ADM-03: 5 min e 1 ms depois não conta', () => {
    expect(isOnline(ago(5 * 60_000 + 1), 'active', now)).toBe(false)
  })
  it('RN-ADM-03: conta suspensa nunca está logada agora', () => {
    expect(isOnline(ago(1_000), 'suspended', now)).toBe(false)
  })
  it('RN-ADM-03: sem último acesso não está logado', () => {
    expect(isOnline(null, 'active', now)).toBe(false)
  })
})

describe('assertAdminProtection', () => {
  const admin = (id: number, status: 'active' | 'suspended' = 'active') => ({
    id,
    role: 'admin' as const,
    status,
  })
  const student = { id: 9, role: 'student' as const, status: 'active' as const }
  const protectedError = expect.objectContaining({ status: 409, code: 'ADMIN_PROTECTED' })

  it('RN-ADM-12: admin não suspende a si mesmo (409 ADMIN_PROTECTED)', () => {
    expect(() =>
      assertAdminProtection({
        actorId: 1,
        action: 'suspend',
        target: admin(1),
        activeAdminIds: [1, 2],
      }),
    ).toThrowError(protectedError)
  })

  it('RN-ADM-12: admin não exclui a si mesmo (409 ADMIN_PROTECTED)', () => {
    expect(() =>
      assertAdminProtection({
        actorId: 1,
        action: 'delete',
        target: admin(1),
        activeAdminIds: [1, 2],
      }),
    ).toThrowError(protectedError)
  })

  it('RN-ADM-12: suspender aluno nunca é bloqueado por esta regra', () => {
    expect(() =>
      assertAdminProtection({
        actorId: 1,
        action: 'suspend',
        target: student,
        activeAdminIds: [1],
      }),
    ).not.toThrow()
  })

  it('RN-ADM-12: o último admin ativo não pode ser suspenso nem excluído', () => {
    for (const action of ['suspend', 'delete'] as const) {
      expect(() =>
        assertAdminProtection({ actorId: 2, action, target: admin(1), activeAdminIds: [1] }),
      ).toThrowError(protectedError)
    }
  })

  it('RN-ADM-12: admin suspende outro admin quando sobra um ativo', () => {
    expect(() =>
      assertAdminProtection({
        actorId: 2,
        action: 'suspend',
        target: admin(1),
        activeAdminIds: [1, 2],
      }),
    ).not.toThrow()
  })

  it('RN-ADM-12: admin já suspenso pode ser excluído mesmo com um só admin ativo', () => {
    expect(() =>
      assertAdminProtection({
        actorId: 2,
        action: 'delete',
        target: admin(1, 'suspended'),
        activeAdminIds: [2],
      }),
    ).not.toThrow()
  })
})

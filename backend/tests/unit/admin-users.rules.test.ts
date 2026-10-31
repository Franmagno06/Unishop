import { describe, expect, it } from 'vitest'
import { isOnline } from '../../src/admin/users/admin-users.rules'

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

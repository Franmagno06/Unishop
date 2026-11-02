import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../../shared/lib/mock-mode', () => ({ MOCK_MODE: false }))
let currentName = 'Maria de Souza Lima'
vi.mock('../../../../shared/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ name: currentName, email: currentName ? 'admin@unifor.br' : '', course: '', whatsapp: '', avatarUrl: null }),
}))

import { initialsOf, useAdminProfile } from './admin-profile'

describe('useAdminProfile', () => {
  it('usa o nome e o e-mail do admin logado, com as iniciais do primeiro e do último nome', () => {
    const { result } = renderHook(() => useAdminProfile())
    expect(result.current).toEqual({ name: 'Maria de Souza Lima', initials: 'ML', email: 'admin@unifor.br' })
  })

  it('enquanto o perfil carrega (nome vazio), mantém o nome e as iniciais padrão do painel', () => {
    currentName = ''
    const { result } = renderHook(() => useAdminProfile())
    expect(result.current).toEqual({ name: 'Administrador', initials: 'AD', email: '' })
    currentName = 'Maria de Souza Lima'
  })

  it('initialsOf: um nome só, nome vazio e espaços sobrando', () => {
    expect(initialsOf('Admin')).toBe('A')
    expect(initialsOf('   ')).toBe('AD')
    expect(initialsOf('  ana   lima ')).toBe('AL')
    expect(initialsOf('😀 Ana')).toBe('😀A')
  })
})

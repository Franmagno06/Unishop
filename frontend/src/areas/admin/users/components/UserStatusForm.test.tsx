import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../../shared/lib/api'
import type { AdminUser } from '../types/user.types'

const updateUser = vi.fn()
vi.mock('../services/users.service', () => ({ updateUser: (...args: unknown[]) => updateUser(...args) }))

import { UserStatusForm } from './UserStatusForm'

const user: AdminUser = {
  id: 5, name: 'Ana Lima', email: 'ana@edu.unifor.br', course: '', whatsapp: '', avatarUrl: null,
  status: 'active', createdAt: '2026-11-01T10:00:00Z', lastAccessAt: null, isOnline: false,
}

function renderForm() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <MemoryRouter>
        <UserStatusForm user={user} onSaved={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('UserStatusForm · RN-ADM-05, 12', () => {
  it('Salvar fica desabilitado enquanto o status não mudou', () => {
    renderForm()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
  })

  it('RN-ADM-12: 409 ADMIN_PROTECTED mostra a mensagem do servidor, não a genérica', async () => {
    updateUser.mockRejectedValueOnce(new ApiError(409, 'ADMIN_PROTECTED', 'O último administrador ativo não pode ser suspenso.'))
    renderForm()
    await userEvent.selectOptions(screen.getByLabelText('Status da conta'), 'suspended')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText(/último administrador ativo/)).toBeInTheDocument()
  })

  it('403 ACCOUNT_SUSPENDED (admin suspenso durante a sessão) mostra a mensagem do servidor', async () => {
    updateUser.mockRejectedValueOnce(new ApiError(403, 'ACCOUNT_SUSPENDED', 'Sua conta está suspensa.'))
    renderForm()
    await userEvent.selectOptions(screen.getByLabelText('Status da conta'), 'suspended')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Sua conta está suspensa.')).toBeInTheDocument()
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../../shared/lib/api'
import { getCurrentUser, resetCurrentUser } from '../../../../shared/lib/current-user'

const confirmEmailChange = vi.fn()
vi.mock('../services/account.service', () => ({
  confirmEmailChange: (...args: unknown[]) => confirmEmailChange(...args),
}))

import { ConfirmEmailChangePage } from './ConfirmEmailChangePage'

const confirmed = {
  id: 4, name: 'Ana', email: 'novo@edu.unifor.br', course: null, whatsapp: null, avatarUrl: null,
  role: 'student', pendingEmail: null,
}

function renderPage(token = 'abc123') {
  const router = createMemoryRouter(
    [
      { path: '/confirmar-troca-email/:token', element: <ConfirmEmailChangePage /> },
      { path: '/perfil', element: <p>Perfil</p> },
      { path: '/perfil/editar', element: <p>Editar perfil</p> },
    ],
    { initialEntries: [`/confirmar-troca-email/${token}`] },
  )
  render(
    <StrictMode>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

beforeEach(() => {
  confirmEmailChange.mockReset()
  resetCurrentUser()
})

describe('ConfirmEmailChangePage · RN-PER-02', () => {
  it('token válido: confirma uma única vez (mesmo em StrictMode), atualiza o usuário e mostra o novo e-mail', async () => {
    confirmEmailChange.mockResolvedValue(confirmed)
    renderPage('abc123')
    expect(await screen.findByText(/novo@edu\.unifor\.br/)).toBeInTheDocument()
    expect(confirmEmailChange).toHaveBeenCalledTimes(1)
    expect(confirmEmailChange.mock.calls[0]?.[0]).toBe('abc123')
    expect(getCurrentUser().email).toBe('novo@edu.unifor.br')
    expect(screen.getByRole('link', { name: 'Ir para o perfil' })).toHaveAttribute('href', '/perfil')
  })

  it('enquanto confirma mostra o carregamento', () => {
    confirmEmailChange.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent(/Confirmando/)
  })

  it('400 TOKEN_EXPIRED: diz que o link expirou e leva a pedir outro na edição do perfil', async () => {
    confirmEmailChange.mockRejectedValue(new ApiError(400, 'TOKEN_EXPIRED', 'Link expirado. Peça outro.'))
    renderPage()
    expect(await screen.findByText(/expirou/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pedir novo link' })).toHaveAttribute('href', '/perfil/editar')
  })

  it('400 TOKEN_INVALID (já usado, de outra conta ou inexistente) mostra a mensagem e o atalho', async () => {
    confirmEmailChange.mockRejectedValue(new ApiError(400, 'TOKEN_INVALID', 'Link inválido.'))
    renderPage()
    expect(await screen.findByText(/já foi usado ou não é válido/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pedir novo link' })).toBeInTheDocument()
  })

  it('409 EMAIL_ALREADY_REGISTERED: avisa que o e-mail já tem cadastro', async () => {
    confirmEmailChange.mockRejectedValue(new ApiError(409, 'EMAIL_ALREADY_REGISTERED', 'Este e-mail já está cadastrado.'))
    renderPage()
    expect(await screen.findByText(/já tem cadastro/i)).toBeInTheDocument()
  })
})

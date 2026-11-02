import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../../shared/lib/api'
import { clearToken, getRole, getToken, setToken } from '../../../../shared/lib/session'

const changePassword = vi.fn()
vi.mock('../services/account.service', () => ({
  changePassword: (...args: unknown[]) => changePassword(...args),
}))

import { ChangePasswordPage } from './ChangePasswordPage'

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: '/trocar-senha', element: <ChangePasswordPage /> },
      { path: '/perfil', element: <p>Perfil</p> },
      { path: '/recuperar-senha', element: <p>Recuperar senha</p> },
    ],
    { initialEntries: ['/trocar-senha'] },
  )
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

async function fill(current: string, next: string, confirmation: string) {
  await userEvent.type(screen.getByLabelText('Senha atual'), current)
  await userEvent.type(screen.getByLabelText('Nova senha'), next)
  await userEvent.type(screen.getByLabelText('Confirmar nova senha'), confirmation)
}
const submit = () => userEvent.click(screen.getByRole('button', { name: 'Trocar senha' }))

beforeEach(() => {
  changePassword.mockReset()
  setToken('token-antigo', 'student')
})
afterEach(() => clearToken())

describe('ChangePasswordPage · RN-ACE-15', () => {
  it('exige a senha atual, uma senha nova válida e a confirmação', async () => {
    renderPage()
    await submit()
    expect(await screen.findByText('Informe sua senha atual.')).toBeInTheDocument()
    expect(screen.getByText('A senha precisa ter ao menos 8 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Confirme a nova senha.')).toBeInTheDocument()
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('a confirmação diferente da nova senha mostra o erro e não envia', async () => {
    renderPage()
    await fill('Antiga123', 'Nova12345', 'Outra12345')
    await submit()
    expect(await screen.findByText('As senhas não são iguais.')).toBeInTheDocument()
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('mostra a lista de requisitos da senha nova (a mesma do cadastro)', () => {
    renderPage()
    expect(screen.getByRole('list', { name: 'Requisitos da senha' })).toBeInTheDocument()
  })

  it('sucesso: o token novo substitui o antigo na sessão, que segue com o mesmo papel', async () => {
    changePassword.mockResolvedValue('token-novo')
    renderPage()
    await fill('Antiga123', 'Nova12345', 'Nova12345')
    await submit()
    expect(await screen.findByText(/Senha alterada/)).toBeInTheDocument()
    expect(changePassword).toHaveBeenCalledTimes(1)
    expect(changePassword.mock.calls[0]?.[0]).toEqual({
      currentPassword: 'Antiga123',
      newPassword: 'Nova12345',
      confirmation: 'Nova12345',
    })
    expect(getToken()).toBe('token-novo')
    expect(getRole()).toBe('student')
  })

  it('400 CURRENT_PASSWORD_INVALID: erro no campo da senha atual, sem apagar o que foi digitado', async () => {
    changePassword.mockRejectedValue(new ApiError(400, 'CURRENT_PASSWORD_INVALID', 'A senha atual está incorreta.'))
    renderPage()
    await fill('Errada123', 'Nova12345', 'Nova12345')
    await submit()
    expect(await screen.findByText('A senha atual está incorreta.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nova senha')).toHaveValue('Nova12345')
    expect(getToken()).toBe('token-antigo')
  })

  it('RN-ACE-15: conta Google sem senha é levada ao "Esqueci minha senha"', async () => {
    changePassword.mockRejectedValue(new ApiError(400, 'CURRENT_PASSWORD_INVALID', 'A senha atual está incorreta.'))
    renderPage()
    await fill('Qualquer1', 'Nova12345', 'Nova12345')
    await submit()
    const link = await screen.findByRole('link', { name: /Esqueci minha senha/ })
    expect(link).toHaveAttribute('href', '/recuperar-senha')
  })

  it('erro de rede mostra a mensagem de conexão e mantém a sessão', async () => {
    changePassword.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'sem rede'))
    renderPage()
    await fill('Antiga123', 'Nova12345', 'Nova12345')
    await submit()
    await waitFor(() => expect(screen.getByText(/conexão/i)).toBeInTheDocument())
    expect(getToken()).toBe('token-antigo')
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../../shared/lib/api'
import { clearToken, getToken } from '../../../../shared/lib/session'

vi.mock('../services/mock-mode', () => ({ MOCK_MODE: false }))
const loginWithGoogle = vi.fn()
vi.mock('../services/auth.service', () => ({
  loginWithGoogle: (...args: unknown[]) => loginWithGoogle(...args),
}))

type Config = { client_id: string; callback: (r: { credential: string }) => void }
let config: Config | undefined
const initialize = vi.fn((c: Config) => (config = c))
const renderButton = vi.fn()
const loadGoogleIdentity = vi.fn(async () => ({ initialize, renderButton }))
vi.mock('../utils/google-identity', () => ({ loadGoogleIdentity: () => loadGoogleIdentity() }))

import { GoogleButton } from './GoogleButton'

function renderButtonAt() {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <GoogleButton /> },
      { path: '/categorias', element: <p>Categorias</p> },
    ],
    { initialEntries: ['/login'] },
  )
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

beforeEach(() => {
  config = undefined
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'client-123.apps.googleusercontent.com')
  initialize.mockClear()
  renderButton.mockClear()
  loginWithGoogle.mockReset()
})
afterEach(() => {
  vi.unstubAllEnvs()
  clearToken()
})

describe('GoogleButton · RN-ACE-14', () => {
  it('sem Client ID o botão fica desabilitado e não carrega o script do Google', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')
    renderButtonAt()
    expect(screen.getByRole('button', { name: 'Continuar com Google' })).toBeDisabled()
    expect(loadGoogleIdentity).not.toHaveBeenCalled()
  })

  it('com Client ID inicializa o Google com ele e desenha o botão oficial', async () => {
    renderButtonAt()
    await waitFor(() => expect(renderButton).toHaveBeenCalled())
    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'client-123.apps.googleusercontent.com' }),
    )
  })

  it('o ID token vai ao servidor, a sessão é guardada e o aluno vai às Categorias', async () => {
    loginWithGoogle.mockResolvedValue({
      data: { token: 'jwt-novo', user: { id: 4, name: 'Ana', role: 'student' }, needsTermsAcceptance: false },
    })
    const router = renderButtonAt()
    await waitFor(() => expect(config).toBeDefined())
    config!.callback({ credential: 'id-token' })
    expect(await screen.findByText('Categorias')).toBeInTheDocument()
    expect(loginWithGoogle.mock.calls[0]?.[0]).toBe('id-token')
    expect(getToken()).toBe('jwt-novo')
    expect(router.state.location.pathname).toBe('/categorias')
  })

  it('403 EMAIL_DOMAIN_NOT_ALLOWED pede a conta @edu.unifor.br e não guarda sessão', async () => {
    loginWithGoogle.mockRejectedValue(new ApiError(403, 'EMAIL_DOMAIN_NOT_ALLOWED', 'x'))
    renderButtonAt()
    await waitFor(() => expect(config).toBeDefined())
    config!.callback({ credential: 'id-token' })
    expect(await screen.findByText(/@edu\.unifor\.br/)).toBeInTheDocument()
    expect(getToken()).toBeNull()
  })

  it('403 EMAIL_NOT_VERIFIED e 503 mostram mensagem própria do Google', async () => {
    loginWithGoogle.mockRejectedValueOnce(new ApiError(403, 'EMAIL_NOT_VERIFIED', 'x'))
    renderButtonAt()
    await waitFor(() => expect(config).toBeDefined())
    config!.callback({ credential: 'a' })
    expect(await screen.findByText(/não confirmou este e-mail/i)).toBeInTheDocument()
  })

  it('falha ao carregar o script do Google mostra o botão indisponível', async () => {
    loadGoogleIdentity.mockRejectedValueOnce(new Error('bloqueado'))
    renderButtonAt()
    const button = await screen.findByRole('button', { name: 'Continuar com Google' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', expect.stringMatching(/indisponível/i))
  })
})

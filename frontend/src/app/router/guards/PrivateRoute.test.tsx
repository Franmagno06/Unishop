import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/api'
import { clearToken, setToken } from '../../../shared/lib/session'

vi.mock('../../../shared/lib/mock-mode', () => ({ MOCK_MODE: false }))
const api = vi.fn()
vi.mock('../../../shared/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../shared/lib/api')>()),
  api: (...args: unknown[]) => api(...args),
}))

import { PrivateRoute } from './PrivateRoute'

const me = (needsTermsAcceptance: boolean) => ({ data: { user: { id: 1 }, needsTermsAcceptance } })

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <p>Tela de login</p> },
      {
        element: <PrivateRoute />,
        children: [
          { path: '/categorias', element: <p>Categorias</p> },
          { path: '/completar-cadastro', element: <p>Completar cadastro</p> },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

beforeEach(() => api.mockReset())
afterEach(() => clearToken())

describe('PrivateRoute', () => {
  it('RN-ACE-11: sem token vai a /login guardando o destino em state.from', async () => {
    const router = renderAt('/categorias?x=1')
    expect(await screen.findByText('Tela de login')).toBeInTheDocument()
    expect(router.state.location.state).toEqual({ from: '/categorias?x=1' })
    expect(api).not.toHaveBeenCalled()
  })

  it('com token e aceite em dia mostra a rota filha, depois de consultar GET /auth/me', async () => {
    setToken('jwt', 'student')
    api.mockResolvedValue(me(false))
    renderAt('/categorias')
    expect(await screen.findByText('Categorias')).toBeInTheDocument()
    expect(api).toHaveBeenCalledWith('/auth/me', expect.anything())
  })

  it('enquanto GET /auth/me carrega mostra o carregamento, não a página', async () => {
    setToken('jwt', 'student')
    let release: (value: unknown) => void = () => {}
    api.mockReturnValue(new Promise((resolve) => (release = resolve)))
    renderAt('/categorias')
    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('Categorias')).not.toBeInTheDocument()
    release(me(false)) // não deixa a consulta pendurada depois do teste
    expect(await screen.findByText('Categorias')).toBeInTheDocument()
  })

  it('RN-ACE-14: aceite dos Termos pendente leva a /completar-cadastro guardando o destino', async () => {
    setToken('jwt', 'student')
    api.mockResolvedValue(me(true))
    const router = renderAt('/categorias')
    expect(await screen.findByText('Completar cadastro')).toBeInTheDocument()
    expect(router.state.location.state).toEqual({ from: '/categorias' })
  })

  it('RN-ACE-14: a própria tela de completar cadastro abre com o aceite pendente', async () => {
    setToken('jwt', 'student')
    api.mockResolvedValue(me(true))
    renderAt('/completar-cadastro')
    expect(await screen.findByText('Completar cadastro')).toBeInTheDocument()
  })

  it('falha de rede no /auth/me mostra o erro com "Tentar de novo", sem liberar a página', async () => {
    setToken('jwt', 'student')
    api.mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'sem rede'))
    renderAt('/categorias')
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
    expect(screen.queryByText('Categorias')).not.toBeInTheDocument()
    api.mockResolvedValue(me(false))
    screen.getByRole('button', { name: 'Tentar de novo' }).click()
    await waitFor(() => expect(screen.getByText('Categorias')).toBeInTheDocument())
  })
})

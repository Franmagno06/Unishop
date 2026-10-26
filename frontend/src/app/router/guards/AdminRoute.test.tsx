import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { clearToken, setToken } from '../../../shared/lib/session'
import { AdminRoute } from './AdminRoute'

function renderAdmin(entry = '/admin/produtos?pagina=2') {
  const router = createMemoryRouter(
    [
      { element: <AdminRoute />, children: [{ path: '/admin/produtos', element: <p>Painel de produtos</p> }] },
      { path: '/admin/login', element: <p>Login do admin</p> },
      { path: '/categorias', element: <p>Categorias</p> },
    ],
    { initialEntries: [entry] },
  )
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

afterEach(() => clearToken())

describe('AdminRoute (RN-ADM-01)', () => {
  it('sem sessão leva ao login do admin e guarda o destino em "from"', async () => {
    const router = renderAdmin()
    expect(await screen.findByText('Login do admin')).toBeInTheDocument()
    expect(router.state.location.state).toEqual({ from: '/admin/produtos?pagina=2' })
  })

  it('aluno vê "acesso negado" e não o painel', async () => {
    setToken('jwt', 'student')
    renderAdmin()
    expect(await screen.findByRole('heading', { name: 'Acesso negado' })).toBeInTheDocument()
    expect(screen.queryByText('Painel de produtos')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir para as categorias' })).toHaveAttribute('href', '/categorias')
  })

  it('administrador entra no painel', async () => {
    setToken('jwt', 'admin')
    renderAdmin()
    expect(await screen.findByText('Painel de produtos')).toBeInTheDocument()
  })

  it('ao encerrar a sessão dentro do painel, o guard reage na hora', async () => {
    setToken('jwt', 'admin')
    renderAdmin()
    expect(await screen.findByText('Painel de produtos')).toBeInTheDocument()
    act(() => clearToken())
    expect(await screen.findByText('Login do admin')).toBeInTheDocument()
  })
})

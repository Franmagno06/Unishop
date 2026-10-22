import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { clearToken, setToken } from '../../../shared/lib/session'
import { GuestRoute } from './GuestRoute'

function renderGuest() {
  const router = createMemoryRouter(
    [
      { element: <GuestRoute />, children: [{ path: '/login', element: <p>Tela de login</p> }] },
      { path: '/categorias', element: <p>Categorias</p> },
      { path: '/admin/usuarios', element: <p>Painel admin</p> },
    ],
    { initialEntries: ['/login'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

afterEach(() => clearToken())

describe('GuestRoute', () => {
  it('visitante vê a tela de login, cadastro e recuperação', () => {
    renderGuest()
    expect(screen.getByText('Tela de login')).toBeInTheDocument()
  })

  it('aluno já logado vai para Categorias', async () => {
    setToken('jwt', 'student')
    const router = renderGuest()
    expect(await screen.findByText('Categorias')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/categorias')
  })

  it('ao entrar, o aluno volta para a tela guardada em "from" (ex.: o produto) e não para Categorias', async () => {
    const router = createMemoryRouter(
      [
        { element: <GuestRoute />, children: [{ path: '/login', element: <p>Tela de login</p> }] },
        { path: '/categorias', element: <p>Categorias</p> },
        { path: '/produtos/:id', element: <p>Produto</p> },
      ],
      { initialEntries: [{ pathname: '/login', state: { from: '/produtos/7?x=1' } }] },
    )
    render(<RouterProvider router={router} />)
    expect(screen.getByText('Tela de login')).toBeInTheDocument()

    act(() => setToken('jwt', 'student'))

    expect(await screen.findByText('Produto')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/produtos/7')
    expect(router.state.location.search).toBe('?x=1')
  })

  it('administrador ignora o "from" e vai para o painel', async () => {
    setToken('jwt', 'admin')
    const router = createMemoryRouter(
      [
        { element: <GuestRoute />, children: [{ path: '/login', element: <p>Tela de login</p> }] },
        { path: '/produtos/:id', element: <p>Produto</p> },
        { path: '/admin/usuarios', element: <p>Painel admin</p> },
      ],
      { initialEntries: [{ pathname: '/login', state: { from: '/produtos/7' } }] },
    )
    render(<RouterProvider router={router} />)
    expect(await screen.findByText('Painel admin')).toBeInTheDocument()
  })

  it('administrador já logado vai para o painel', async () => {
    setToken('jwt', 'admin')
    const router = renderGuest()
    expect(await screen.findByText('Painel admin')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/usuarios')
  })

  it('depois de sair, a tela de login volta a abrir', async () => {
    setToken('jwt', 'student')
    const router = renderGuest()
    await screen.findByText('Categorias')

    act(() => clearToken())
    await act(async () => {
      await router.navigate('/login')
    })

    expect(screen.getByText('Tela de login')).toBeInTheDocument()
  })
})

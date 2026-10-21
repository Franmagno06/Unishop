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

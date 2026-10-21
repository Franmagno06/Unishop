import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, renderHook, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { clearToken, setToken } from '../lib/session'
import { useLogout } from './use-logout'
import { useSession } from './use-session'

afterEach(() => clearToken())

describe('useSession', () => {
  it('sem sessão: não está logado', () => {
    const { result } = renderHook(() => useSession())
    expect(result.current).toEqual({ isLoggedIn: false, role: null })
  })

  it('já logado ao abrir: devolve o papel', () => {
    setToken('jwt', 'admin')
    const { result } = renderHook(() => useSession())
    expect(result.current).toEqual({ isLoggedIn: true, role: 'admin' })
  })

  it('acompanha a sessão sem recarregar: entrar e sair atualizam na hora', () => {
    const { result } = renderHook(() => useSession())

    act(() => setToken('jwt', 'student'))
    expect(result.current).toEqual({ isLoggedIn: true, role: 'student' })

    act(() => clearToken())
    expect(result.current).toEqual({ isLoggedIn: false, role: null })
  })
})

describe('useLogout', () => {
  function LogoutButton() {
    const logout = useLogout()
    return <button onClick={logout}>sair</button>
  }

  function renderLogout() {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['categories', ''], [{ id: 1 }])
    const router = createMemoryRouter(
      [
        { path: '/', element: <p>Tela inicial</p> },
        { path: '/categorias', element: <LogoutButton /> },
      ],
      { initialEntries: ['/', '/categorias'], initialIndex: 1 },
    )
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    return { router, queryClient }
  }

  it('apaga a sessão, limpa o cache e volta à tela inicial', async () => {
    setToken('jwt', 'student')
    const { router, queryClient } = renderLogout()
    expect(queryClient.getQueryData(['categories', ''])).toBeDefined()

    await act(async () => screen.getByRole('button', { name: 'sair' }).click())

    expect(sessionStorage.getItem('unishop.token')).toBeNull()
    expect(queryClient.getQueryData(['categories', ''])).toBeUndefined()
    expect(router.state.location.pathname).toBe('/')
    expect(screen.getByText('Tela inicial')).toBeInTheDocument()
  })

  it('troca a entrada do histórico: o Voltar não reabre a tela de quem estava logado', async () => {
    setToken('jwt', 'student')
    const { router } = renderLogout()

    await act(async () => screen.getByRole('button', { name: 'sair' }).click())

    expect(router.state.historyAction).toBe('REPLACE')
  })
})

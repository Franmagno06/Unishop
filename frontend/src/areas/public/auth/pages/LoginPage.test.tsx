import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearToken, getToken } from '../../../../shared/lib/session'
import { LoginPage } from './LoginPage'

function renderLogin() {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/categorias', element: <p>Categorias</p> },
      { path: '/admin/usuarios', element: <p>Painel admin</p> },
    ],
    { initialEntries: ['/login'] },
  )
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  clearToken()
})

describe('LoginPage', () => {
  it('mostra os erros de validação sem chamar a API', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    renderLogin()

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Informe seu e-mail.')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('mostra uma mensagem única para credenciais inválidas (RN-ACE-08)', async () => {
    mockFetch(401, { error: { code: 'INVALID_CREDENTIALS', message: 'x' } })
    renderLogin()

    await userEvent.type(screen.getByLabelText('E-mail institucional'), 'ana@edu.unifor.br')
    await userEvent.type(screen.getByLabelText('Senha'), 'Senha1234')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.')
  })

  it('guarda o token e leva o aluno para Categorias', async () => {
    mockFetch(200, { data: { token: 'jwt', user: { id: 1, name: 'Ana', role: 'student' } } })
    renderLogin()

    await userEvent.type(screen.getByLabelText('E-mail institucional'), 'ana@edu.unifor.br')
    await userEvent.type(screen.getByLabelText('Senha'), 'Senha1234')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Categorias')).toBeInTheDocument()
    expect(getToken()).toBe('jwt')
  })

  it('leva o admin para o painel (RN-ACE-13)', async () => {
    mockFetch(200, { data: { token: 'jwt', user: { id: 2, name: 'Admin', role: 'admin' } } })
    renderLogin()

    await userEvent.type(screen.getByLabelText('E-mail institucional'), 'admin@unishop.local')
    await userEvent.type(screen.getByLabelText('Senha'), 'qualquer')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(screen.getByText('Painel admin')).toBeInTheDocument())
  })
})

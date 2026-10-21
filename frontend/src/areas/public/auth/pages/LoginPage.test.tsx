import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearToken, getToken } from '../../../../shared/lib/session'
import { LoginPage } from './LoginPage'

function renderLogin(initialEntry: string | { pathname: string; state?: unknown } = '/login') {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/categorias', element: <p>Categorias</p> },
      { path: '/admin/usuarios', element: <p>Painel admin</p> },
    ],
    { initialEntries: [initialEntry] },
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

async function fillAndSubmit(email = 'ana@edu.unifor.br', password = 'Senha1234') {
  await userEvent.type(screen.getByLabelText('E-mail institucional'), email)
  await userEvent.type(screen.getByLabelText('Senha'), password)
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
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

  it('guarda o token e leva o aluno para Categorias', async () => {
    mockFetch(200, { data: { token: 'jwt', user: { id: 1, name: 'Ana', role: 'student' } } })
    renderLogin()

    await fillAndSubmit()

    expect(await screen.findByText('Categorias')).toBeInTheDocument()
    expect(getToken()).toBe('jwt')
  })

  it('leva o admin para o painel (RN-ACE-13)', async () => {
    mockFetch(200, { data: { token: 'jwt', user: { id: 2, name: 'Admin', role: 'admin' } } })
    renderLogin()

    await fillAndSubmit('admin@unishop.local', 'qualquer')

    await waitFor(() => expect(screen.getByText('Painel admin')).toBeInTheDocument())
  })

  it('volta para a tela de onde o aluno veio, quando houver', async () => {
    mockFetch(200, { data: { token: 'jwt', user: { id: 1, name: 'Ana', role: 'student' } } })
    renderLogin({ pathname: '/login', state: { from: '/categorias' } })

    await fillAndSubmit()

    expect(await screen.findByText('Categorias')).toBeInTheDocument()
  })

  it('mostra o aviso de conta criada depois do cadastro', () => {
    renderLogin({ pathname: '/login', state: { registered: true } })
    expect(screen.getByRole('status')).toHaveTextContent('Conta criada! Entre com seu e-mail e senha.')
  })

  it('não mostra o aviso de demonstração fora do modo de demonstração', () => {
    renderLogin()
    expect(screen.queryByText('Modo de demonstração (sem servidor)')).not.toBeInTheDocument()
  })
})

describe('LoginPage · alertas de erro', () => {
  it('credencial inválida: alerta com título e mensagem única (RN-ACE-08)', async () => {
    mockFetch(401, { error: { code: 'INVALID_CREDENTIALS', message: 'x' } })
    renderLogin()

    await fillAndSubmit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Não foi possível entrar')
    expect(alert).toHaveTextContent('E-mail ou senha incorretos.')
    // não revela qual dos dois estava errado
    expect(alert).not.toHaveTextContent(/e-mail não|senha errada|não existe/i)
  })

  it('mantém o e-mail, limpa a senha e leva o foco a ela', async () => {
    mockFetch(401, { error: { code: 'INVALID_CREDENTIALS', message: 'x' } })
    renderLogin()

    await fillAndSubmit('ana@edu.unifor.br', 'SenhaErrada1')
    await screen.findByRole('alert')

    expect(screen.getByLabelText('E-mail institucional')).toHaveValue('ana@edu.unifor.br')
    expect(screen.getByLabelText('Senha')).toHaveValue('')
    expect(screen.getByLabelText('Senha')).toHaveFocus()
  })

  it('o alerta some enquanto a nova tentativa está em andamento', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: { code: 'INVALID_CREDENTIALS', message: 'x' } }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
        .mockReturnValueOnce(new Promise(() => {})),
    )
    renderLogin()

    await fillAndSubmit()
    await screen.findByRole('alert')

    await userEvent.type(screen.getByLabelText('Senha'), 'OutraSenha1')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('button', { name: 'Entrando…' })).toBeDisabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('conta bloqueada: diz quanto tempo falta (RN-ACE-09)', async () => {
    mockFetch(429, { error: { code: 'ACCOUNT_LOCKED', message: 'x', retryAfter: 900 } })
    renderLogin()

    await fillAndSubmit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Conta bloqueada')
    expect(alert).toHaveTextContent('Tente de novo em 15 minutos.')
  })

  it('conta suspensa (RN-ACE-12)', async () => {
    mockFetch(403, { error: { code: 'ACCOUNT_SUSPENDED', message: 'x' } })
    renderLogin()

    await fillAndSubmit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Conta suspensa')
    expect(alert).toHaveTextContent('Sua conta está suspensa. Fale com o suporte.')
  })

  it('sem conexão com o servidor', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    renderLogin()

    await fillAndSubmit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Sem conexão')
    expect(alert).toHaveTextContent('Confira sua conexão e tente de novo.')
  })

  it('erro do servidor (500)', async () => {
    mockFetch(500, { error: { code: 'INTERNAL_ERROR', message: 'x' } })
    renderLogin()

    await fillAndSubmit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Servidor indisponível')
  })

  it('o erro de validação do campo não usa o alerta (só o erro do envio usa)', async () => {
    renderLogin()
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await screen.findByText('Informe seu e-mail.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

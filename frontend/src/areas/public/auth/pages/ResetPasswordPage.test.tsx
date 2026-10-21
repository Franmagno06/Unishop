import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ResetPasswordPage } from './ResetPasswordPage'
import { ResetSuccessPage } from './ResetSuccessPage'

function renderPage(token = 'abc123') {
  const router = createMemoryRouter(
    [
      { path: '/redefinir-senha/:token', element: <ResetPasswordPage /> },
      { path: '/senha-redefinida', element: <ResetSuccessPage /> },
      { path: '/recuperar-senha', element: <h1>Esqueceu a senha?</h1> },
      { path: '/login', element: <p>Tela de login</p> },
    ],
    { initialEntries: [`/redefinir-senha/${token}`] },
  )
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const ok = () => new Response(null, { status: 200 })
const failed = (status: number, code: string) =>
  new Response(JSON.stringify({ error: { code, message: 'x' } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

async function fill(password = 'NovaSenha1', confirmation = password) {
  await userEvent.type(screen.getByLabelText('Nova senha'), password)
  await userEvent.type(screen.getByLabelText('Confirmar nova senha'), confirmation)
}
const submit = () => userEvent.click(screen.getByRole('button', { name: 'Redefinir senha' }))

afterEach(() => vi.unstubAllGlobals())

describe('ResetPasswordPage · estrutura', () => {
  it('mostra o título, os dois campos, os requisitos e o Voltar para o login', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Criar nova senha' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nova senha')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText('Confirmar nova senha')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('list', { name: 'Requisitos da senha' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nova senha')).toHaveAccessibleDescription(/8 a 72 caracteres/)
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute('href', '/login')
  })

  it('marca os requisitos enquanto a pessoa digita', async () => {
    renderPage()
    expect(screen.queryByText('(atendido)')).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Nova senha'), 'Senha1234')

    expect(screen.getAllByText('(atendido)')).toHaveLength(3)
  })
})

describe('ResetPasswordPage · validação', () => {
  it('campos vazios: mostra os erros e não chama a API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    await submit()

    expect(await screen.findByText('A senha precisa ter ao menos 8 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Confirme a senha.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ['sem maiúscula', 'senha1234', 'Inclua ao menos uma letra maiúscula.'],
    ['sem número', 'SenhaSenha', 'Inclua ao menos um número.'],
  ])('recusa senha %s', async (_label, password, message) => {
    vi.stubGlobal('fetch', vi.fn())
    renderPage()

    await fill(password)
    await submit()

    expect(await screen.findByText(message)).toBeInTheDocument()
  })

  it('recusa confirmação diferente', async () => {
    renderPage()
    await fill('NovaSenha1', 'Outra1234')
    await submit()
    expect(await screen.findByText('As senhas não são iguais.')).toBeInTheDocument()
  })
})

describe('ResetPasswordPage · envio', () => {
  it('manda o token do link e a nova senha, e leva a "Senha redefinida!"', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok())
    vi.stubGlobal('fetch', fetchMock)
    const router = renderPage('meu-token-9')

    await fill()
    await submit()

    expect(await screen.findByRole('heading', { level: 1, name: 'Senha redefinida!' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/senha-redefinida')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/auth\/reset-password$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      token: 'meu-token-9',
      password: 'NovaSenha1',
      passwordConfirmation: 'NovaSenha1',
    })
  })

  it('a tela de sucesso substitui a do formulário no histórico (Voltar não reabre o formulário)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok()))
    const router = renderPage()

    await fill()
    await submit()
    await screen.findByRole('heading', { name: 'Senha redefinida!' })

    await router.navigate(-1)

    expect(router.state.location.pathname).not.toBe('/redefinir-senha/abc123')
  })

  it('desabilita o botão e avisa enquanto redefine', async () => {
    const fetchMock = vi.fn().mockReturnValue(new Promise(() => {}))
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    await fill()
    await submit()

    const button = await screen.findByRole('button', { name: 'Redefinindo…' })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('ResetPasswordPage · erros do link', () => {
  it('link expirado: alerta e atalho para pedir um novo (RN-ACE-10)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(failed(400, 'TOKEN_EXPIRED')))
    renderPage()

    await fill()
    await submit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Link expirado')
    expect(alert).toHaveTextContent('Este link expirou (ele vale 30 minutos). Peça um novo link.')
    expect(screen.getByRole('link', { name: 'Pedir novo link' })).toHaveAttribute('href', '/recuperar-senha')
  })

  it('link inválido ou já usado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(failed(400, 'TOKEN_INVALID')))
    renderPage()

    await fill()
    await submit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Link inválido')
    expect(alert).toHaveTextContent('Este link já foi usado ou não é válido.')
    expect(screen.getByRole('link', { name: 'Pedir novo link' })).toBeInTheDocument()
  })

  it('o atalho "Pedir novo link" leva a "Esqueceu a senha?"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(failed(400, 'TOKEN_EXPIRED')))
    const router = renderPage()

    await fill()
    await submit()
    await userEvent.click(await screen.findByRole('link', { name: 'Pedir novo link' }))

    expect(router.state.location.pathname).toBe('/recuperar-senha')
  })

  it('outros erros (500) não oferecem "Pedir novo link"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(failed(500, 'INTERNAL_ERROR')))
    renderPage()

    await fill()
    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Servidor indisponível')
    expect(screen.queryByRole('link', { name: 'Pedir novo link' })).not.toBeInTheDocument()
  })

  it('os campos continuam preenchidos depois de um erro', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(failed(500, 'INTERNAL_ERROR')))
    renderPage()

    await fill()
    await submit()
    await screen.findByRole('alert')

    expect(screen.getByLabelText('Nova senha')).toHaveValue('NovaSenha1')
  })
})

describe('ResetSuccessPage', () => {
  it('confirma a troca e leva ao login, sem botão Voltar', async () => {
    const router = createMemoryRouter(
      [
        { path: '/senha-redefinida', element: <ResetSuccessPage /> },
        { path: '/login', element: <p>Tela de login</p> },
      ],
      { initialEntries: ['/senha-redefinida'] },
    )
    render(<RouterProvider router={router} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Senha redefinida!' })).toBeInTheDocument()
    expect(screen.getByText(/Sua senha foi alterada com sucesso/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Voltar' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: 'Ir para o login' }))
    expect(router.state.location.pathname).toBe('/login')
  })
})

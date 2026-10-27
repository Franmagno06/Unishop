import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CheckEmailPage } from './CheckEmailPage'
import { ForgotPasswordPage } from './ForgotPasswordPage'

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: '/recuperar-senha', element: <ForgotPasswordPage /> },
      { path: '/recuperar-senha/enviado', element: <CheckEmailPage /> },
      { path: '/login', element: <p>Tela de login</p> },
    ],
    { initialEntries: ['/recuperar-senha'] },
  )
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const accepted = () => new Response(null, { status: 202 })
const failed = (status: number, code: string) =>
  new Response(JSON.stringify({ error: { code, message: 'x' } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const submit = () => userEvent.click(screen.getByRole('button', { name: 'Enviar link' }))

afterEach(() => vi.unstubAllGlobals())

describe('ForgotPasswordPage · estrutura', () => {
  it('mostra o título, o campo, o botão e o Voltar para o login', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Esqueceu a senha?' })).toBeInTheDocument()
    expect(screen.getByText(/enviaremos um link para você criar uma nova senha/)).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail institucional')).toHaveAttribute('type', 'email')
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute('href', '/login')
  })

  it('configura o campo de e-mail para o navegador e o teclado do celular', () => {
    renderPage()
    const email = screen.getByLabelText('E-mail institucional')
    expect(email).toHaveAttribute('autocomplete', 'email')
    expect(email).toHaveAttribute('inputmode', 'email')
    expect(email).toHaveAttribute('spellcheck', 'false')
  })
})

describe('ForgotPasswordPage · validação', () => {
  it('e-mail vazio: erro no campo e nenhuma chamada à API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    await submit()

    expect(await screen.findByText('Informe seu e-mail.')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail institucional')).toHaveAttribute('aria-invalid', 'true')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('e-mail em formato inválido', async () => {
    vi.stubGlobal('fetch', vi.fn())
    renderPage()

    await userEvent.type(screen.getByLabelText('E-mail institucional'), 'ana@')
    await submit()

    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument()
  })
})

describe('ForgotPasswordPage · envio', () => {
  it('pede o link e leva a "Verifique seu e-mail" com o e-mail digitado (sem espaços)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(accepted())
    vi.stubGlobal('fetch', fetchMock)
    const router = renderPage()

    await userEvent.type(screen.getByLabelText('E-mail institucional'), '  ana@edu.unifor.br ')
    await submit()

    expect(await screen.findByRole('heading', { level: 1, name: 'Verifique seu e-mail' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/recuperar-senha/enviado')
    expect(screen.getByText('ana@edu.unifor.br')).toBeInTheDocument()

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/auth\/forgot-password$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ email: 'ana@edu.unifor.br' })
  })

  it('aceita e-mail de fora do domínio (a recuperação vale para qualquer conta)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(accepted())
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    await userEvent.type(screen.getByLabelText('E-mail institucional'), 'admin@unishop.local')
    await submit()

    expect(await screen.findByRole('heading', { name: 'Verifique seu e-mail' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('desabilita o botão e avisa enquanto envia, evitando envio duplo', async () => {
    const fetchMock = vi.fn().mockReturnValue(new Promise(() => {}))
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    await userEvent.type(screen.getByLabelText('E-mail institucional'), 'ana@edu.unifor.br')
    await submit()

    const button = await screen.findByRole('button', { name: 'Enviando…' })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('ForgotPasswordPage · erros do envio', () => {
  it.each([
    [429, 'TOO_MANY_REQUESTS', 'Muitas tentativas', 'Muitas tentativas. Tente de novo em instantes.'],
    [500, 'INTERNAL_ERROR', 'Servidor indisponível', 'O servidor não conseguiu responder. Tente de novo em instantes.'],
  ])('%i %s: alerta com título e mensagem, e continua na tela', async (status, code, title, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(failed(status, code)))
    const router = renderPage()

    await userEvent.type(screen.getByLabelText('E-mail institucional'), 'ana@edu.unifor.br')
    await submit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(title)
    expect(alert).toHaveTextContent(message)
    expect(router.state.location.pathname).toBe('/recuperar-senha')
    expect(screen.getByLabelText('E-mail institucional')).toHaveValue('ana@edu.unifor.br')
  })

  it('sem conexão com o servidor', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    renderPage()

    await userEvent.type(screen.getByLabelText('E-mail institucional'), 'ana@edu.unifor.br')
    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão')
  })
})

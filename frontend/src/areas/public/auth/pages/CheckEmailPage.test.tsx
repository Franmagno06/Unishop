import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CheckEmailPage } from './CheckEmailPage'

const EMAIL = 'ana@edu.unifor.br'

function renderPage(state: unknown = { email: EMAIL }) {
  const router = createMemoryRouter(
    [
      { path: '/recuperar-senha/enviado', element: <CheckEmailPage /> },
      { path: '/recuperar-senha', element: <h1>Esqueceu a senha?</h1> },
    ],
    { initialEntries: [{ pathname: '/recuperar-senha/enviado', state }] },
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

afterEach(() => vi.unstubAllGlobals())

describe('CheckEmailPage', () => {
  it('mostra o e-mail, a validade de 30 minutos e o aviso da caixa de spam (RN-ACE-10)', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Verifique seu e-mail' })).toBeInTheDocument()
    expect(screen.getByText(EMAIL)).toBeInTheDocument()
    expect(screen.getByText(/Ele expira em 30 minutos/)).toBeInTheDocument()
    expect(screen.getByText(/Confira também a caixa de spam/)).toBeInTheDocument()
  })

  it('tem o Voltar, com "Esqueceu a senha?" como destino padrão, e o link de reenvio', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute('href', '/recuperar-senha')
    expect(screen.getByRole('button', { name: 'Não recebeu? Reenviar e-mail' })).toBeEnabled()
  })

  it('não mostra a simulação do e-mail fora do modo de demonstração', () => {
    renderPage()
    expect(screen.queryByText('Abrir link do e-mail (simulação)')).not.toBeInTheDocument()
    expect(screen.queryByText('Modo de demonstração (sem servidor)')).not.toBeInTheDocument()
  })

  it('aberta direto (sem o e-mail da tela anterior), volta para pedir o link', async () => {
    const router = renderPage(null)

    expect(await screen.findByRole('heading', { name: 'Esqueceu a senha?' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/recuperar-senha')
  })

  it('quebra e-mails muito longos sem estourar a tela', () => {
    renderPage({ email: `${'a'.repeat(120)}@edu.unifor.br` })
    expect(screen.getByText(/^a{120}@edu\.unifor\.br$/)).toHaveClass('break-all')
  })
})

describe('CheckEmailPage · reenviar', () => {
  it('reenvia para o mesmo e-mail e confirma com um aviso', async () => {
    const fetchMock = vi.fn().mockResolvedValue(accepted())
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Não recebeu? Reenviar e-mail' }))

    expect(await screen.findByRole('status')).toHaveTextContent('E-mail reenviado. Confira sua caixa de entrada.')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/auth\/forgot-password$/)
    expect(JSON.parse(init.body as string)).toEqual({ email: EMAIL })
  })

  it('desabilita o botão enquanto reenvia', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Não recebeu? Reenviar e-mail' }))

    expect(await screen.findByRole('button', { name: 'Reenviando…' })).toBeDisabled()
  })

  it('mostra um alerta quando o reenvio falha', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: 'TOO_MANY_REQUESTS', message: 'x' } }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Não recebeu? Reenviar e-mail' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Muitas tentativas')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

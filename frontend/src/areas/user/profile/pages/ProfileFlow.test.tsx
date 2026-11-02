import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetCurrentUser } from '../../../../shared/lib/current-user'
import { clearToken, getToken, setToken } from '../../../../shared/lib/session'
import { EditProfilePage } from './EditProfilePage'
import { ProfilePage } from './ProfilePage'

// "Meus anúncios" usa os dados de exemplo; o perfil (GET, PATCH e DELETE de /users/me) usa a API simulada abaixo.
vi.mock('../../listings/services/my-listings.service', () => import('../../listings/services/my-listings.mock'))

// API simulada: GET, PATCH e DELETE de /users/me e o pedido de troca de e-mail (backend.md §9), com o
// estado do aluno em memória. Como o servidor, o PATCH recusa um e-mail diferente do atual (RN-PER-02).
type Call = { url: string; method: string; body: Record<string, unknown> | undefined }
function stubApi() {
  let user = {
    id: 1,
    name: 'Aluno Teste',
    email: 'aluno.teste@edu.unifor.br',
    course: 'Ciência da Computação',
    whatsapp: '85991234567',
    avatarUrl: null,
    role: 'student',
  }
  const calls: Call[] = []
  const reply = (status: number, data?: unknown) =>
    new Response(data === undefined ? null : JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      const body = init?.body ? (JSON.parse(String(init.body)) as Call['body']) : undefined
      calls.push({ url: String(url), method, body })
      if (method === 'GET') return reply(200, { data: { user } })
      if (method === 'PATCH') {
        if (body?.email !== user.email) {
          return reply(400, { error: { code: 'VALIDATION_ERROR', message: 'O e-mail só muda por link.' } })
        }
        user = { ...user, ...body }
        return reply(200, { data: { user } })
      }
      if (method === 'POST' && String(url).endsWith('/users/me/email-change') && emailChangeStatus === 502) {
        return reply(502, { error: { code: 'EXTERNAL_SERVICE_ERROR', message: 'Não foi possível enviar o e-mail agora.' } })
      }
      if (method === 'POST' && String(url).endsWith('/users/me/email-change')) {
        return reply(202, { data: { pendingEmail: body?.email, expiresInMinutes: 30 } })
      }
      if (method === 'DELETE' && deleteStatus === 409) {
        return reply(409, { error: { code: 'HAS_OPEN_PAID_ORDERS', message: 'Há pedido pago em aberto.' } })
      }
      return reply(204)
    }),
  )
  return calls
}

let calls: Call[]
let deleteStatus = 204
let emailChangeStatus = 202

beforeEach(() => {
  deleteStatus = 204
  emailChangeStatus = 202
  setToken('token-de-teste')
  calls = stubApi()
})

function renderApp(initialEntry = '/perfil') {
  const router = createMemoryRouter(
    [
      { path: '/', element: <p>Tela inicial</p> },
      { path: '/perfil', element: <ProfilePage /> },
      { path: '/perfil/editar', element: <EditProfilePage /> },
      { path: '/meus-pedidos', element: <p>Tela de pedidos</p> },
    ],
    { initialEntries: [initialEntry] },
  )
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

afterEach(() => {
  vi.unstubAllGlobals()
  resetCurrentUser()
  clearToken()
})

describe('Perfil (05)', () => {
  it('mostra o cartão do aluno e os anúncios dele, com os atalhos', async () => {
    renderApp()

    expect(await screen.findByRole('heading', { level: 1, name: 'Aluno Teste' })).toBeInTheDocument()
    expect(screen.getByText('aluno.teste@edu.unifor.br')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+ Anunciar item' })).toHaveAttribute('href', '/anunciar')
    expect(screen.getByRole('link', { name: 'Meus pedidos' })).toHaveAttribute('href', '/meus-pedidos')
    expect(screen.getByRole('link', { name: 'Editar perfil' })).toHaveAttribute('href', '/perfil/editar')

    const row = await screen.findByRole('link', { name: /Cálculo I — Guidorizzi/ })
    expect(row).toHaveAttribute('href', '/anuncios/1/gerenciar')
    expect(within(row).getByText(/R\$\s45,00 · Livros e apostilas/)).toBeInTheDocument()
    expect(within(row).getByText('Contato: Bloco D · 14h às 16h')).toBeInTheDocument()
  })

  it('anuncia o carregamento e marca o anúncio pausado', async () => {
    renderApp()
    expect(screen.getByRole('status')).toHaveTextContent('Carregando anúncios…')

    const paused = await screen.findByRole('link', { name: /Calculadora HP 12C/ })
    expect(within(paused).getByText('Pausado')).toBeInTheDocument()
  })
})

describe('Editar perfil (05b)', () => {
  it('valida os campos antes de salvar', async () => {
    renderApp('/perfil/editar')
    const user = userEvent.setup()

    await user.clear(await screen.findByLabelText('Nome'))
    await user.type(screen.getByLabelText('WhatsApp'), '123')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('O nome precisa ter ao menos 3 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Informe o WhatsApp com DDD (10 ou 11 dígitos).')).toBeInTheDocument()
  })

  it('salva e volta ao perfil com o nome novo e o aviso de sucesso', async () => {
    const router = renderApp('/perfil/editar')
    const user = userEvent.setup()

    await user.clear(await screen.findByLabelText('Nome'))
    await user.type(screen.getByLabelText('Nome'), 'Maria Souza')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/perfil'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Maria Souza' })).toBeInTheDocument()
    expect(screen.getByText('Perfil atualizado')).toBeInTheDocument()
  })

  it('RN-PER-02: o e-mail novo não troca na hora: o PATCH leva o atual, o link é pedido e o perfil avisa', async () => {
    renderApp('/perfil/editar')
    const user = userEvent.setup()

    await user.clear(await screen.findByLabelText('E-mail institucional'))
    await user.type(screen.getByLabelText('E-mail institucional'), 'novo.email@edu.unifor.br')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText(/Enviamos um link de confirmação para novo.email@edu.unifor.br/)).toBeInTheDocument()
    expect(calls.find((call) => call.method === 'PATCH')?.body).toMatchObject({
      email: 'aluno.teste@edu.unifor.br',
    })
    expect(calls.find((call) => call.url.endsWith('/users/me/email-change'))?.body).toEqual({
      email: 'novo.email@edu.unifor.br',
    })
  })

  it('RN-PER-02: falha no envio do e-mail (502) depois do PATCH avisa que os dados foram salvos', async () => {
    emailChangeStatus = 502
    renderApp('/perfil/editar')
    const user = userEvent.setup()

    await user.clear(await screen.findByLabelText('E-mail institucional'))
    await user.type(screen.getByLabelText('E-mail institucional'), 'novo.email@edu.unifor.br')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText(/Seus dados foram salvos, mas o e-mail não foi trocado/)).toBeInTheDocument()
  })

  it('recusa e-mail fora do domínio institucional', async () => {
    renderApp('/perfil/editar')
    const user = userEvent.setup()

    await user.clear(await screen.findByLabelText('E-mail institucional'))
    await user.type(screen.getByLabelText('E-mail institucional'), 'aluno@gmail.com')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Use seu e-mail institucional @edu.unifor.br.')).toBeInTheDocument()
  })

  it('recusa foto que não é JPG ou PNG e foto acima de 4 MB (RN-PER-05)', async () => {
    renderApp('/perfil/editar')
    const user = userEvent.setup({ applyAccept: false })
    const input = await screen.findByLabelText('Escolher foto de perfil')

    await user.upload(input, new File(['x'], 'foto.gif', { type: 'image/gif' }))
    expect(await screen.findByText('Use uma imagem JPG ou PNG.')).toBeInTheDocument()

    const big = new File(['x'], 'foto.png', { type: 'image/png' })
    Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 })
    await user.upload(input, big)
    expect(await screen.findByText('A foto pode ter no máximo 4 MB.')).toBeInTheDocument()
  })

  it('excluir perfil: o botão só habilita ao digitar EXCLUIR, e a conta sai da sessão', async () => {
    const router = renderApp('/perfil/editar')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Excluir perfil' }))
    const dialog = screen.getByRole('dialog', { name: 'Excluir seu perfil?' })
    const confirm = within(dialog).getByRole('button', { name: 'Excluir perfil' })
    expect(confirm).toBeDisabled()

    await user.type(within(dialog).getByLabelText('Digite EXCLUIR para confirmar'), 'excluir')
    expect(confirm).toBeDisabled()
    await user.clear(within(dialog).getByLabelText('Digite EXCLUIR para confirmar'))
    await user.type(within(dialog).getByLabelText('Digite EXCLUIR para confirmar'), 'EXCLUIR')
    expect(confirm).toBeEnabled()

    await user.click(confirm)
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(getToken()).toBeNull()
    expect(calls.find((call) => call.method === 'DELETE')?.body).toEqual({ confirmation: 'EXCLUIR' })
  })

  it('RN-PER-06: 409 HAS_OPEN_PAID_ORDERS mostra o motivo no pop-up e mantém a sessão', async () => {
    deleteStatus = 409
    const router = renderApp('/perfil/editar')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Excluir perfil' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Digite EXCLUIR para confirmar'), 'EXCLUIR')
    await user.click(within(dialog).getByRole('button', { name: 'Excluir perfil' }))

    expect(await within(dialog).findByText(/pedidos pagos ou com retirada combinada em aberto/)).toBeInTheDocument()
    expect(getToken()).toBe('token-de-teste')
    expect(router.state.location.pathname).toBe('/perfil/editar')
  })

  it('cancelar o pop-up não exclui nada', async () => {
    renderApp('/perfil/editar')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Excluir perfil' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Editar perfil' })).toBeInTheDocument()
  })
})

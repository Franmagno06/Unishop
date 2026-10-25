import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { resetCurrentUser } from '../../../../shared/lib/current-user'
import { clearToken, getToken, setToken } from '../../../../shared/lib/session'
import { EditProfilePage } from './EditProfilePage'
import { ProfilePage } from './ProfilePage'

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
  resetCurrentUser()
  clearToken()
})

describe('Perfil (05)', () => {
  it('mostra o cartão do aluno e os anúncios dele, com os atalhos', async () => {
    renderApp()

    expect(screen.getByRole('heading', { level: 1, name: 'Aluno Teste' })).toBeInTheDocument()
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

    await user.clear(screen.getByLabelText('Nome'))
    await user.type(screen.getByLabelText('WhatsApp'), '123')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('O nome precisa ter ao menos 3 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Informe o WhatsApp com DDD (10 ou 11 dígitos).')).toBeInTheDocument()
  })

  it('salva e volta ao perfil com o nome novo e o aviso de sucesso', async () => {
    const router = renderApp('/perfil/editar')
    const user = userEvent.setup()

    await user.clear(screen.getByLabelText('Nome'))
    await user.type(screen.getByLabelText('Nome'), 'Maria Souza')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/perfil'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Maria Souza' })).toBeInTheDocument()
    expect(screen.getByText('Perfil atualizado')).toBeInTheDocument()
  })

  it('e-mail novo não vale na hora: avisa que precisa de confirmação (RN-PER-02)', async () => {
    renderApp('/perfil/editar')
    const user = userEvent.setup()

    await user.clear(screen.getByLabelText('E-mail institucional'))
    await user.type(screen.getByLabelText('E-mail institucional'), 'novo.email@edu.unifor.br')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('Confirme o novo e-mail')).toBeInTheDocument()
    expect(screen.getByText(/novo\.email@edu\.unifor\.br/)).toBeInTheDocument()
    expect(screen.getByText('aluno.teste@edu.unifor.br')).toBeInTheDocument()
  })

  it('recusa e-mail fora do domínio institucional', async () => {
    renderApp('/perfil/editar')
    const user = userEvent.setup()

    await user.clear(screen.getByLabelText('E-mail institucional'))
    await user.type(screen.getByLabelText('E-mail institucional'), 'aluno@gmail.com')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('Use seu e-mail institucional @edu.unifor.br.')).toBeInTheDocument()
  })

  it('recusa foto que não é JPG ou PNG e foto acima de 4 MB (RN-PER-05)', async () => {
    renderApp('/perfil/editar')
    const user = userEvent.setup({ applyAccept: false })
    const input = screen.getByLabelText('Escolher foto de perfil')

    await user.upload(input, new File(['x'], 'foto.gif', { type: 'image/gif' }))
    expect(await screen.findByText('Use uma imagem JPG ou PNG.')).toBeInTheDocument()

    const big = new File(['x'], 'foto.png', { type: 'image/png' })
    Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 })
    await user.upload(input, big)
    expect(await screen.findByText('A foto pode ter no máximo 4 MB.')).toBeInTheDocument()
  })

  it('excluir perfil: o botão só habilita ao digitar EXCLUIR, e a conta sai da sessão', async () => {
    setToken('token-de-teste')
    const router = renderApp('/perfil/editar')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Excluir meu perfil' }))
    const dialog = screen.getByRole('dialog', { name: 'Excluir seu perfil?' })
    const confirm = within(dialog).getByRole('button', { name: 'Sim, excluir perfil' })
    expect(confirm).toBeDisabled()

    await user.type(within(dialog).getByLabelText('Digite EXCLUIR para confirmar'), 'excluir')
    expect(confirm).toBeDisabled()
    await user.clear(within(dialog).getByLabelText('Digite EXCLUIR para confirmar'))
    await user.type(within(dialog).getByLabelText('Digite EXCLUIR para confirmar'), 'EXCLUIR')
    expect(confirm).toBeEnabled()

    await user.click(confirm)
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(getToken()).toBeNull()
  })

  it('cancelar o pop-up não exclui nada', async () => {
    renderApp('/perfil/editar')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Excluir meu perfil' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Editar perfil' })).toBeInTheDocument()
  })
})

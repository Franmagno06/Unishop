import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetProductsData } from '../../products/services/products.data'
import { resetUsersData } from '../services/users.data'
import { AdminUserDetailPage } from './AdminUserDetailPage'
import { AdminUserEditPage } from './AdminUserEditPage'
import { AdminUsersPage } from './AdminUsersPage'

beforeEach(() => {
  resetUsersData()
  resetProductsData()
})

function renderAt(entry: string) {
  const router = createMemoryRouter(
    [
      { path: '/admin/usuarios', element: <AdminUsersPage /> },
      { path: '/admin/usuarios/:id', element: <AdminUserDetailPage /> },
      { path: '/admin/usuarios/:id/editar', element: <AdminUserEditPage /> },
    ],
    { initialEntries: [entry] },
  )
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

describe('Admin · lista de usuários (A01)', () => {
  it('mostra os indicadores, as linhas do Figma e o resumo', async () => {
    renderAt('/admin/usuarios')
    expect(screen.getByRole('status')).toHaveTextContent('Carregando usuários…')

    const row = await screen.findByRole('row', { name: /Francisco Magno/ })
    expect(within(row).getByText('franmagno06@edu.unifor.br')).toBeInTheDocument()
    expect(within(row).getByText('Logado agora')).toBeInTheDocument()
    expect(within(await screen.findByRole('row', { name: /Carla Mendes/ })).getByText('Visto há 2 h')).toBeInTheDocument()

    expect(await screen.findByText('1.412')).toBeInTheDocument()
    expect(screen.getByText('Mostrando 7 de 1.412 usuários')).toBeInTheDocument()
  })

  it('o filtro vira parâmetro da URL e a busca sem resultado mostra o estado vazio', async () => {
    const router = renderAt('/admin/usuarios')
    await screen.findByRole('row', { name: /Francisco Magno/ })

    await userEvent.click(screen.getByRole('button', { name: 'Offline' }))
    expect(router.state.location.search).toBe('?status=offline')
    expect(screen.getByRole('button', { name: 'Offline' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.type(screen.getByLabelText('Buscar por nome ou e-mail'), 'zzzz-ninguem')
    expect(await screen.findByRole('heading', { name: 'Nenhum usuário encontrado' })).toBeInTheDocument()
  })

  it('abre já com a busca e a página da URL', async () => {
    renderAt('/admin/usuarios?busca=larissa')
    expect(await screen.findByRole('row', { name: /Larissa Moura/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Francisco Magno/ })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Buscar por nome ou e-mail')).toHaveValue('larissa')
  })

  it('"Excluir" abre o pop-up com o foco em "Cancelar" e o anúncio do nome certo', async () => {
    renderAt('/admin/usuarios')
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir Pedro Alves' }))

    const dialog = screen.getByRole('dialog', { name: 'Excluir este usuário?' })
    expect(within(dialog).getByText(/A conta de Pedro Alves será anonimizada/)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  })
})

describe('Admin · detalhes do usuário (A02)', () => {
  it('mostra os dados, os indicadores e os anúncios da pessoa', async () => {
    renderAt('/admin/usuarios/2')
    expect(await screen.findByRole('heading', { level: 2, name: 'Ana Lima' })).toBeInTheDocument()
    expect(screen.getByText('(85) 9 9123-4567')).toBeInTheDocument()
    expect(screen.getByText('Engenharia Civil')).toBeInTheDocument()
    expect(screen.getByText('Logado agora')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Cálculo I — Guidorizzi/ })).toHaveAttribute('href', '/admin/produtos/1')
    expect(screen.getByRole('link', { name: 'Editar usuário' })).toHaveAttribute('href', '/admin/usuarios/2/editar')
  })

  it('usuário que não existe mostra "não encontrado", com saída para a lista', async () => {
    renderAt('/admin/usuarios/99999')
    expect(await screen.findByRole('heading', { name: 'Usuário não encontrado' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver usuários' })).toHaveAttribute('href', '/admin/usuarios')
  })

  it('excluir quem tem pedido pago em aberto mostra o motivo e mantém o pop-up aberto', async () => {
    renderAt('/admin/usuarios/2')
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir usuário' }))
    const dialog = screen.getByRole('dialog', { name: 'Excluir este usuário?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sim, excluir' }))
    expect(await within(dialog).findByText(/há pedido pago ou com retirada combinada em aberto/)).toBeInTheDocument()
  })

  it('excluir quem não tem pendência volta à lista', async () => {
    const router = renderAt('/admin/usuarios/7')
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir usuário' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sim, excluir' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Usuários' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/usuarios')
  })
})

describe('Admin · editar usuário (A02b)', () => {
  it('abre preenchido e valida o e-mail institucional antes de salvar (RN-ADM-04)', async () => {
    renderAt('/admin/usuarios/2/editar')
    const email = await screen.findByLabelText('E-mail institucional *')
    expect(email).toHaveValue('ana.lima@edu.unifor.br')
    expect(screen.getByLabelText('WhatsApp')).toHaveValue('(85) 9 9123-4567')

    await userEvent.clear(email)
    await userEvent.type(email, 'ana@gmail.com')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(await screen.findByText('Use o e-mail institucional @edu.unifor.br.')).toBeInTheDocument()
  })

  it('nome curto e WhatsApp incompleto também são recusados', async () => {
    renderAt('/admin/usuarios/2/editar')
    const name = await screen.findByLabelText('Nome *')
    await userEvent.clear(name)
    await userEvent.type(name, 'An')
    const phone = screen.getByLabelText('WhatsApp')
    await userEvent.clear(phone)
    await userEvent.type(phone, '8599')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(await screen.findByText('O nome precisa ter ao menos 3 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Informe o WhatsApp com DDD (10 ou 11 dígitos).')).toBeInTheDocument()
  })

  it('e-mail de outra conta mostra o erro no campo', async () => {
    renderAt('/admin/usuarios/2/editar')
    const email = await screen.findByLabelText('E-mail institucional *')
    await userEvent.clear(email)
    await userEvent.type(email, 'bruno.sales@edu.unifor.br')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(await screen.findByText('Este e-mail já está cadastrado.')).toBeInTheDocument()
  })

  it('salvar abre "Alterações salvas!" e o botão volta aos detalhes', async () => {
    const router = renderAt('/admin/usuarios/4/editar')
    const course = await screen.findByLabelText('Curso')
    await userEvent.clear(course)
    await userEvent.type(course, 'Odontologia')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    const dialog = await screen.findByRole('dialog', { name: 'Alterações salvas!' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Voltar' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Detalhes do usuário' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/usuarios/4')
    expect(await screen.findByText('Odontologia')).toBeInTheDocument()
  })
})

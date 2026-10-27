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
    expect(screen.getByRole('link', { name: 'Editar' })).toHaveAttribute('href', '/admin/usuarios/2/editar')
  })

  it('usuário que não existe mostra "não encontrado", com saída para a lista', async () => {
    renderAt('/admin/usuarios/99999')
    expect(await screen.findByRole('heading', { name: 'Usuário não encontrado' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver usuários' })).toHaveAttribute('href', '/admin/usuarios')
  })

  it('excluir quem tem pedido pago em aberto mostra o motivo e mantém o pop-up aberto', async () => {
    renderAt('/admin/usuarios/2')
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir' }))
    const dialog = screen.getByRole('dialog', { name: 'Excluir este usuário?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }))
    expect(await within(dialog).findByText(/há pedido pago ou com retirada combinada em aberto/)).toBeInTheDocument()
  })

  it('excluir quem não tem pendência volta à lista', async () => {
    const router = renderAt('/admin/usuarios/7')
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Usuários' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/usuarios')
  })
})

describe('Admin · editar usuário (A02b)', () => {
  it('mostra os dados só para consulta e deixa editar apenas o status', async () => {
    renderAt('/admin/usuarios/2/editar')
    expect(await screen.findByText('ana.lima@edu.unifor.br')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nome *')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('E-mail institucional *')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Status da conta')).toHaveValue('active')
    expect(within(screen.getByLabelText('Status da conta')).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Ativa',
      'Suspensa',
    ])
  })

  it('salvar o status abre "Alterações salvas!" e o botão volta aos detalhes com a conta suspensa', async () => {
    const router = renderAt('/admin/usuarios/4/editar')
    await userEvent.selectOptions(await screen.findByLabelText('Status da conta'), 'Suspensa')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    const dialog = await screen.findByRole('dialog', { name: 'Alterações salvas!' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Voltar' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Detalhes do usuário' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/usuarios/4')
    expect(await screen.findByText('Conta suspensa')).toBeInTheDocument()
  })
})

describe('Admin · perfil pela lista', () => {
  it('foto e nome do usuário na lista abrem os detalhes', async () => {
    const router = renderAt('/admin/usuarios')
    await userEvent.click(await screen.findByRole('link', { name: 'Abrir perfil de Carla Mendes' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Detalhes do usuário' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/usuarios/4')
  })
})

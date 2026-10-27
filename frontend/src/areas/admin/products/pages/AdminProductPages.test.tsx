import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetUsersData } from '../../users/services/users.data'
import { resetProductsData } from '../services/products.data'
import { AdminProductDetailPage } from './AdminProductDetailPage'
import { AdminProductEditPage } from './AdminProductEditPage'
import { AdminProductsPage } from './AdminProductsPage'

beforeEach(() => {
  resetUsersData()
  resetProductsData()
})

function renderAt(entry: string) {
  const router = createMemoryRouter(
    [
      { path: '/admin/produtos', element: <AdminProductsPage /> },
      { path: '/admin/produtos/:id', element: <AdminProductDetailPage /> },
      { path: '/admin/produtos/:id/editar', element: <AdminProductEditPage /> },
      { path: '/admin/usuarios/:id', element: <p>Detalhes do usuário</p> },
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

describe('Admin · lista de produtos (A03)', () => {
  it('mostra os indicadores, as linhas do Figma com preço e status, e o resumo', async () => {
    renderAt('/admin/produtos')
    const row = await screen.findByRole('row', { name: /Cálculo I/ })
    expect(within(row).getByText('Livros e apostilas')).toBeInTheDocument()
    expect(within(row).getByText(/R\$\s45,00/)).toBeInTheDocument()
    expect(within(row).getByText('Ana Lima')).toBeInTheDocument()
    expect(within(row).getByText('Ativo')).toBeInTheDocument()
    expect(within(await screen.findByRole('row', { name: /Física I/ })).getByText('Pausado')).toBeInTheDocument()
    expect(within(await screen.findByRole('row', { name: /Jaleco/ })).getByText('Vendido')).toBeInTheDocument()

    expect(await screen.findByText('152')).toBeInTheDocument()
    expect(screen.getByText('Mostrando 6 de 266 produtos')).toBeInTheDocument()
  })

  it('a busca aceita no máximo 100 caracteres', async () => {
    renderAt('/admin/produtos')
    const field = await screen.findByLabelText('Buscar produto ou vendedor')
    await userEvent.click(field)
    await userEvent.paste('a'.repeat(150))
    expect((field as HTMLInputElement).value).toHaveLength(100)
  })

  it('?busca= maior que 100 vindo da URL é cortado', async () => {
    renderAt('/admin/produtos?busca=' + 'b'.repeat(300))
    const field = await screen.findByLabelText('Buscar produto ou vendedor')
    expect((field as HTMLInputElement).value).toHaveLength(100)
  })

  it('o filtro de categoria vai para a URL e a lista só traz a categoria escolhida', async () => {
    const router = renderAt('/admin/produtos')
    await screen.findByRole('row', { name: /Cálculo I/ })
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por categoria'), 'Alimentos')
    expect(router.state.location.search).toBe('?categoria=3')
    // Enquanto a lista nova não chega, a anterior continua na tela: espera a troca.
    await waitFor(() => expect(screen.queryByRole('row', { name: /Cálculo I/ })).not.toBeInTheDocument())
    expect(screen.getByRole('row', { name: /Brownie caseiro/ })).toBeInTheDocument()
  })

  it('excluir produto com pedido pago em aberto mostra o motivo no pop-up', async () => {
    renderAt('/admin/produtos')
    await userEvent.click(await screen.findByRole('button', { name: /^Excluir Cálculo I/ }))
    const dialog = screen.getByRole('dialog', { name: 'Excluir este produto?' })
    expect(within(dialog).getByText(/o vendedor será notificado/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }))
    expect(await within(dialog).findByText(/há pedido pago ou com retirada combinada em aberto/)).toBeInTheDocument()
  })

  it('excluir produto sem pendência o tira da lista e avisa', async () => {
    renderAt('/admin/produtos')
    await userEvent.click(await screen.findByRole('button', { name: /^Excluir Apostila de Anatomia/ }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))
    expect(await screen.findByText('O produto “Apostila de Anatomia Humana” foi excluído.')).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Apostila de Anatomia/ })).not.toBeInTheDocument()
  })
})

describe('Admin · detalhes do produto (A04)', () => {
  it('mostra o anúncio, o vendedor, as miniaturas e os indicadores', async () => {
    renderAt('/admin/produtos/1')
    expect(await screen.findByRole('heading', { level: 2, name: 'Cálculo I — Guidorizzi, vol. 1' })).toBeInTheDocument()
    expect(screen.getByText(/Usado apenas no semestre passado/)).toBeInTheDocument()
    expect(screen.getByText(/ana\.lima@edu\.unifor\.br · WhatsApp \(85\) 9 9123-4567/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Ver foto/ })).toHaveLength(3)
    expect(screen.getByRole('link', { name: 'Ver usuário →' })).toHaveAttribute('href', '/admin/usuarios/2')
    expect(screen.getByText('128')).toBeInTheDocument()
  })

  it('produto que não existe mostra "não encontrado"', async () => {
    renderAt('/admin/produtos/99999')
    expect(await screen.findByRole('heading', { name: 'Produto não encontrado' })).toBeInTheDocument()
  })
})

describe('Admin · editar produto (A05)', () => {
  it('mostra os dados só para consulta e deixa editar apenas o status (Ativo ou Pausado)', async () => {
    renderAt('/admin/produtos/1/editar')
    expect(await screen.findByText('Cálculo I — Guidorizzi, vol. 1')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nome do produto *')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Vendedor responsável *' })).not.toBeInTheDocument()
    const status = screen.getByLabelText('Status')
    expect(status).toHaveValue('active')
    expect(within(status).getAllByRole('option').map((o) => o.textContent)).toEqual(['Ativo', 'Pausado'])
  })

  it('produto vendido também oferece "Vendido" (o admin pode reverter)', async () => {
    renderAt('/admin/produtos/6/editar')
    const status = await screen.findByLabelText('Status')
    expect(status).toHaveValue('sold')
    expect(within(status).getAllByRole('option').map((o) => o.textContent)).toEqual(['Ativo', 'Pausado', 'Vendido'])
  })

  it('salvar abre "Alterações salvas!" e o botão volta ao produto com o status novo', async () => {
    const router = renderAt('/admin/produtos/1/editar')
    await userEvent.selectOptions(await screen.findByLabelText('Status'), 'Pausado')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    const dialog = await screen.findByRole('dialog', { name: 'Alterações salvas!' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Voltar' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Detalhes do produto' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/produtos/1')
    expect(await screen.findByText('Pausado')).toBeInTheDocument()
  })
})

describe('Admin · detalhes pela lista', () => {
  it('imagem e nome do produto na lista abrem os detalhes', async () => {
    const router = renderAt('/admin/produtos')
    await userEvent.click(await screen.findByRole('link', { name: 'Abrir Calculadora HP 12C' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Detalhes do produto' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/produtos/2')
  })

  it('foto e nome do vendedor, nos detalhes, abrem o perfil dele', async () => {
    const router = renderAt('/admin/produtos/1')
    await userEvent.click(await screen.findByRole('link', { name: 'Abrir perfil de Ana Lima' }))
    expect(router.state.location.pathname).toBe('/admin/usuarios/2')
  })
})

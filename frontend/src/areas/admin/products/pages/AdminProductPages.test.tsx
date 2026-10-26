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
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sim, excluir' }))
    expect(await within(dialog).findByText(/há pedido pago ou com retirada combinada em aberto/)).toBeInTheDocument()
  })

  it('excluir produto sem pendência o tira da lista e avisa', async () => {
    renderAt('/admin/produtos')
    await userEvent.click(await screen.findByRole('button', { name: /^Excluir Apostila de Anatomia/ }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sim, excluir' }))
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
  it('abre preenchido, com o preço em reais e o vendedor atual', async () => {
    renderAt('/admin/produtos/1/editar')
    expect(await screen.findByLabelText('Nome do produto *')).toHaveValue('Cálculo I — Guidorizzi, vol. 1')
    expect(screen.getByLabelText('Preço (R$) *')).toHaveValue('45,00')
    expect(screen.getByLabelText('Categoria *')).toHaveValue('1')
    expect(screen.getByRole('combobox', { name: 'Vendedor responsável *' })).toHaveValue(
      'Ana Lima — ana.lima@edu.unifor.br',
    )
    expect(screen.getByLabelText('Status')).toHaveValue('active')
  })

  it('valida os limites do anúncio antes de salvar (Regras §9)', async () => {
    renderAt('/admin/produtos/1/editar')
    const title = await screen.findByLabelText('Nome do produto *')
    await userEvent.clear(title)
    await userEvent.type(title, 'Ab')
    const price = screen.getByLabelText('Preço (R$) *')
    await userEvent.clear(price)
    await userEvent.type(price, '100000')
    const description = screen.getByLabelText('Descrição *')
    await userEvent.clear(description)
    await userEvent.type(description, 'Curta')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('O nome deve ter pelo menos 3 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('O preço pode ser no máximo R$ 99.999,99.')).toBeInTheDocument()
    expect(screen.getByText('A descrição deve ter pelo menos 10 caracteres.')).toBeInTheDocument()
  })

  it('salvar abre "Alterações salvas!" e o botão volta ao produto com os dados novos', async () => {
    const router = renderAt('/admin/produtos/3/editar')
    const price = await screen.findByLabelText('Preço (R$) *')
    await userEvent.clear(price)
    await userEvent.type(price, '55,50')
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'sold')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    const dialog = await screen.findByRole('dialog', { name: 'Alterações salvas!' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Voltar' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Detalhes do produto' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/produtos/3')
    expect(await screen.findByText(/R\$\s55,50/)).toBeInTheDocument()
    expect(screen.getByText('Vendido')).toBeInTheDocument()
  })

  it('trocar o vendedor de produto com pedido aberto mostra o erro no campo', async () => {
    renderAt('/admin/produtos/2/editar')
    const seller = await screen.findByRole('combobox', { name: 'Vendedor responsável *' })
    await userEvent.clear(seller)
    await userEvent.type(seller, 'bruno')
    await userEvent.click(await screen.findByRole('option', { name: /Bruno Sales/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(
      await screen.findByText('Este produto tem pedido aberto, então o vendedor não pode ser trocado agora.'),
    ).toBeInTheDocument()
  })
})

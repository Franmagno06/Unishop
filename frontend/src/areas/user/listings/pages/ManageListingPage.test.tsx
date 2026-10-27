import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ManageListingPage } from './ManageListingPage'

function renderPage(id: string) {
  const router = createMemoryRouter(
    [
      { path: '/anuncios/:id/gerenciar', element: <ManageListingPage /> },
      { path: '/perfil', element: <p>Tela do perfil</p> },
    ],
    { initialEntries: [`/anuncios/${id}/gerenciar`] },
  )
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

// Os dados de exemplo ficam em memória e duram o arquivo todo: a ordem dos testes importa.
describe('Gerenciar anúncio (05d)', () => {
  it('mostra o resumo, os indicadores e os pedidos recebidos', async () => {
    renderPage('1')

    expect(await screen.findByRole('heading', { level: 2, name: 'Cálculo I — Guidorizzi, vol. 1' })).toBeInTheDocument()
    expect(screen.getByText('Ativo')).toBeInTheDocument()
    expect(screen.getByText('Livros e apostilas')).toBeInTheDocument()
    expect(screen.getByText(/Publicado em 10\/09\/2026 · WhatsApp \(85\) 9 9123-4567/)).toBeInTheDocument()

    expect(screen.getByText('Visualizações').nextSibling).toHaveTextContent('128')
    expect(screen.getByText('Contatos pelo WhatsApp').nextSibling).toHaveTextContent('9')
    expect(screen.getByText('Pedidos recebidos', { selector: 'dt' }).nextSibling).toHaveTextContent('2')

    const orders = screen.getAllByRole('listitem')
    expect(within(orders[0]!).getByText('João Pereira')).toBeInTheDocument()
    expect(within(orders[0]!).getByText('Pagou pelo site · Pix · 24/09/2026')).toBeInTheDocument()
    expect(within(orders[0]!).getByText('Pago · combinar retirada')).toBeInTheDocument()
    expect(within(orders[1]!).getByText('Chamou no WhatsApp · 22/09/2026')).toBeInTheDocument()
    expect(within(orders[1]!).getByText('Em negociação')).toBeInTheDocument()
  })

  it('pedido Pago oferece "Combinar retirada"; Em negociação oferece concluir ou encerrar', async () => {
    renderPage('1')
    const user = userEvent.setup()
    await screen.findByText('João Pereira')

    const [paid, negotiating] = screen.getAllByRole('listitem')
    expect(within(negotiating!).getByRole('button', { name: 'Concluir venda' })).toBeInTheDocument()
    expect(within(negotiating!).getByRole('button', { name: 'Encerrar negociação' })).toBeInTheDocument()

    await user.click(within(paid!).getByRole('button', { name: 'Combinar retirada' }))
    expect(await screen.findByText('Retirada combinada')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Combinar retirada' })).not.toBeInTheDocument()
  })

  it('encerrar a negociação cancela o pedido e tira o WhatsApp dele', async () => {
    renderPage('1')
    const user = userEvent.setup()
    await screen.findByText('Larissa Moura')

    await user.click(screen.getByRole('button', { name: 'Encerrar negociação' }))

    expect(await screen.findByText('Cancelado')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Larissa Moura/ })).not.toBeInTheDocument()
  })

  it('pausar muda o selo e o botão vira "Reativar anúncio"', async () => {
    renderPage('1')
    const user = userEvent.setup()
    await screen.findByRole('button', { name: 'Pausar anúncio' })

    await user.click(screen.getByRole('button', { name: 'Pausar anúncio' }))

    expect(await screen.findByRole('button', { name: 'Reativar anúncio' })).toBeInTheDocument()
    expect(screen.getByText('Pausado')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pausar anúncio' })).not.toBeInTheDocument()
  })

  it('o anúncio 2 já abre pausado (05e), com "Editar anúncio" levando ao formulário', async () => {
    renderPage('2')

    expect(await screen.findByRole('button', { name: 'Reativar anúncio' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Editar anúncio' })).toHaveAttribute('href', '/anuncios/2/editar')
    expect(screen.getByText(/Nenhum pedido recebido ainda/)).toBeInTheDocument()
  })

  it('marcar como vendido pede confirmação; vendido não pode ser reativado', async () => {
    renderPage('2')
    const user = userEvent.setup()
    await screen.findByRole('button', { name: 'Marcar vendido' })

    await user.click(screen.getByRole('button', { name: 'Marcar vendido' }))
    const dialog = screen.getByRole('dialog', { name: 'Marcar como vendido?' })
    expect(dialog).toHaveAccessibleDescription(/Você não poderá reativá-lo/)
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar venda' }))

    expect(await screen.findByText('Vendido')).toBeInTheDocument()
    expect(screen.getByText('Este anúncio foi vendido e não pode ser reativado.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reativar anúncio' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Marcar vendido' })).not.toBeInTheDocument()
  })

  it('excluir é bloqueado com pedido pago ou com retirada combinada em aberto (RN-ANU-09)', async () => {
    renderPage('1')
    const user = userEvent.setup()
    await screen.findByRole('heading', { level: 2, name: 'Cálculo I — Guidorizzi, vol. 1' })

    await user.click(screen.getAllByRole('button', { name: 'Excluir anúncio' })[0]!)
    const dialog = screen.getByRole('dialog', { name: 'Excluir este anúncio?' })
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/pedidos pagos ou com retirada combinada em aberto/)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('excluir sem pedidos em aberto leva ao perfil', async () => {
    const router = renderPage('2')
    const user = userEvent.setup()
    await screen.findByRole('heading', { level: 2, name: 'Calculadora HP 12C' })

    await user.click(screen.getByRole('button', { name: 'Excluir anúncio' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/perfil'))
  })

  it('anúncio que não existe mostra "não encontrado"', async () => {
    renderPage('999')

    expect(await screen.findByText('Anúncio não encontrado')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Voltar ao perfil' }).length).toBeGreaterThan(0)
  })
})

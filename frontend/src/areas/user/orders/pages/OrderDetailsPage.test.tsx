import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { OrderDetailsPage } from './OrderDetailsPage'

function renderPage(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/meus-pedidos', element: <p>Tela de pedidos</p> },
      { path: '/meus-pedidos/:id', element: <OrderDetailsPage /> },
    ],
    { initialEntries: [path] },
  )
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('Detalhes do pedido', () => {
  it('mostra prazo de entrega, forma de pagamento e o botão de cancelar do pedido pago', async () => {
    renderPage('/meus-pedidos/417')
    expect(await screen.findByRole('heading', { name: 'Detalhes do pedido' })).toBeInTheDocument()
    expect(screen.getByText('Prazo de entrega')).toBeInTheDocument()
    expect(screen.getByText('01/10/2026')).toBeInTheDocument()
    expect(screen.getByText('Pix')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar pedido' })).toBeInTheDocument()
  })

  it('só confirma o cancelamento depois de marcar o motivo', async () => {
    renderPage('/meus-pedidos/390')
    const user = userEvent.setup()
    expect(await screen.findByText('Pagamento na entrega')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar pedido' }))
    const dialog = screen.getByRole('dialog', { name: 'Cancelar este pedido?' })
    const confirm = within(dialog).getByRole('button', { name: 'Cancelar pedido' })
    expect(confirm).toBeDisabled()

    await user.click(within(dialog).getByRole('radio', { name: 'Atraso na entrega' }))
    await user.click(confirm)

    expect(await screen.findByText('Motivo do cancelamento')).toBeInTheDocument()
    expect(screen.getByText('Atraso na entrega')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('avisa quando o pedido não existe', async () => {
    renderPage('/meus-pedidos/999')
    expect(await screen.findByText('Pedido não encontrado')).toBeInTheDocument()
  })

  it('pedido pago: cancela com motivo e depois avisa o prazo do reembolso (Pix)', async () => {
    renderPage('/meus-pedidos/417')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Cancelar pedido' }))
    const dialog = screen.getByRole('dialog', { name: 'Confirmar o cancelamento?' })
    const confirm = within(dialog).getByRole('button', { name: 'Cancelar pedido' })
    expect(confirm).toBeDisabled()
    await user.click(within(dialog).getByRole('radio', { name: 'Mudei de ideia' }))
    await user.click(confirm)

    const info = await screen.findByRole('dialog', { name: 'Pedido cancelado' })
    expect(within(info).getByText('até 1 dia útil')).toBeInTheDocument()
    await user.click(within(info).getByRole('button', { name: 'Entendi' }))
    expect(await screen.findByText('Motivo do cancelamento')).toBeInTheDocument()
  })

  it('pedido pago no cartão mostra outro prazo de reembolso', async () => {
    renderPage('/meus-pedidos/405')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Cancelar pedido' }))
    const dialog = screen.getByRole('dialog', { name: 'Confirmar o cancelamento?' })
    await user.click(within(dialog).getByRole('radio', { name: 'Outros' }))
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar pedido' }))
    expect(await screen.findByText(/até 30 dias/)).toBeInTheDocument()
  })

  it('pedido concluído: avalia o produto só depois de dar uma nota', async () => {
    renderPage('/meus-pedidos/371')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Fazer avaliação' }))
    const dialog = screen.getByRole('dialog', { name: 'Avaliar este produto' })
    const send = within(dialog).getByRole('button', { name: 'Enviar avaliação' })
    expect(send).toBeDisabled()

    await user.click(within(dialog).getAllByRole('button', { name: /estrela/i })[4]!)
    expect(send).toBeEnabled()
    await user.click(send)

    const sent = await screen.findByRole('dialog', { name: 'Avaliação enviada' })
    await user.click(within(sent).getByRole('button', { name: 'Entendi' }))
    expect(await screen.findByText('Você já avaliou este produto.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fazer avaliação' })).not.toBeInTheDocument()
  })

  it('pedido concluído: pede reembolso só com a descrição e vira Em análise', async () => {
    renderPage('/meus-pedidos/371')
    const user = userEvent.setup()
    expect(await screen.findByText('Pagamento na entrega')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar pedido' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Pedir reembolso' }))
    const dialog = screen.getByRole('dialog', { name: 'Pedir reembolso' })
    const confirm = within(dialog).getByRole('button', { name: 'Confirmar reembolso' })
    expect(confirm).toBeDisabled()
    await user.type(within(dialog).getByRole('textbox', { name: /Descreva o problema/ }), 'Veio com páginas faltando')
    await user.click(confirm)

    const sent = await screen.findByRole('dialog', { name: 'Pedido de reembolso enviado' })
    expect(within(sent).getByText(/suporte responde/)).toBeInTheDocument()
    await user.click(within(sent).getByRole('button', { name: 'Entendi' }))
    expect(await screen.findByText('Em análise')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pedir reembolso' })).not.toBeInTheDocument()
  })

  it('reembolso aprovado: "Não recebi reembolso" avisa o suporte', async () => {
    renderPage('/meus-pedidos/360')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Não recebi reembolso' }))
    const info = await screen.findByRole('dialog', { name: 'Suporte informado' })
    await user.click(within(info).getByRole('button', { name: 'Entendi' }))
    expect(await screen.findByText(/O suporte foi informado/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Não recebi reembolso' })).not.toBeInTheDocument()
  })
})

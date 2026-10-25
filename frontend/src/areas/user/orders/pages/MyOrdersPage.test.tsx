import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { MyOrdersPage } from './MyOrdersPage'

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: '/meus-pedidos', element: <MyOrdersPage /> },
      { path: '/perfil', element: <p>Tela do perfil</p> },
    ],
    { initialEntries: ['/meus-pedidos'] },
  )
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('Meus pedidos (05c)', () => {
  it('lista os pedidos do mais recente ao mais antigo, com estado, preço e vendedor', async () => {
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Carregando pedidos…')

    const cards = await screen.findAllByRole('article')
    expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual([
      'Cálculo I — Guidorizzi, vol. 1',
      'Física I — Halliday, 10ª ed.',
      'Apostila de Anatomia Humana',
    ])

    const first = within(cards[0]!)
    expect(first.getByText('Pago · aguardando retirada')).toBeInTheDocument()
    expect(first.getByText(/R\$\s45,00/)).toBeInTheDocument()
    expect(first.getByText('Pedido #UNI-2026-0417 · 24/09/2026')).toBeInTheDocument()
    expect(first.getByText('João Paulo')).toBeInTheDocument()
    expect(first.getByText('Pago pelo site')).toBeInTheDocument()
    expect(first.getByText('WhatsApp: (85) 9 9123-4567')).toBeInTheDocument()

    expect(within(cards[1]!).getByText('Reservado em 22/09/2026')).toBeInTheDocument()
    expect(within(cards[2]!).getByText('Recebido em 15/09/2026')).toBeInTheDocument()
    expect(within(cards[2]!).getByText('Negociado pelo WhatsApp')).toBeInTheDocument()
  })

  it('o link do WhatsApp abre em outra aba, com noopener', async () => {
    renderPage()
    const [first] = await screen.findAllByRole('article')

    const link = within(first!).getByRole('link', { name: /Falar no WhatsApp com João Paulo/ })
    expect(link).toHaveAttribute('href', 'https://wa.me/5585991234567')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('só oferece "Confirmar recebimento" na retirada combinada, e nenhum cancelamento em pedido pago', async () => {
    renderPage()
    const cards = await screen.findAllByRole('article')

    expect(within(cards[0]!).queryByRole('button')).not.toBeInTheDocument()
    expect(within(cards[1]!).getByRole('button', { name: 'Confirmar recebimento' })).toBeInTheDocument()
    expect(within(cards[2]!).queryByRole('button')).not.toBeInTheDocument()
  })

  it('confirmar recebimento pede confirmação e conclui o pedido', async () => {
    renderPage()
    const user = userEvent.setup()
    const cards = await screen.findAllByRole('article')

    await user.click(within(cards[1]!).getByRole('button', { name: 'Confirmar recebimento' }))
    const dialog = screen.getByRole('dialog', { name: 'Confirmar recebimento?' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar recebimento' }))

    const updated = await screen.findAllByRole('article')
    expect(await within(updated[1]!).findByText('Concluído')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(updated[1]!).queryByRole('button')).not.toBeInTheDocument()
  })
})

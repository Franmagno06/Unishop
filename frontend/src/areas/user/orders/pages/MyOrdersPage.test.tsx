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
      'Calculadora científica Casio fx-82',
      'Fone de ouvido Bluetooth JBL',
      'Apostila de Anatomia Humana',
      'Camiseta do curso de Direito (M)',
    ])

    const first = within(cards[0]!)
    expect(first.getByText('Pago · aguardando retirada')).toBeInTheDocument()
    expect(first.getByText(/R\$\s45,00/)).toBeInTheDocument()
    expect(first.getByText('Pedido #UNI-2026-0417 · 24/09/2026')).toBeInTheDocument()
    expect(first.getByText('João Paulo')).toBeInTheDocument()
    expect(first.getByText('Pago pelo site')).toBeInTheDocument()
    expect(first.getByText('WhatsApp: (85) 9 9123-4567')).toBeInTheDocument()

    expect(within(cards[1]!).getByText('Reservado em 22/09/2026')).toBeInTheDocument()
    expect(within(cards[4]!).getByText('Recebido em 15/09/2026')).toBeInTheDocument()
    expect(within(cards[4]!).getByText('Negociado pelo WhatsApp')).toBeInTheDocument()
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
    expect(within(cards[2]!).getByRole('button', { name: 'Cancelar pedido' })).toBeInTheDocument()
    expect(within(cards[3]!).queryByRole('button')).not.toBeInTheDocument()
    expect(within(cards[4]!).queryByRole('button')).not.toBeInTheDocument()
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

  it('o selo de Concluído é verde e o de Cancelado é vermelho', async () => {
    renderPage()
    const user = userEvent.setup()
    const cards = await screen.findAllByRole('article')
    expect(within(cards[4]!).getByText('Concluído')).toHaveClass('text-whatsapp-hover')

    await user.click(within(cards[2]!).getByRole('button', { name: 'Cancelar pedido' }))
    const dialog = screen.getByRole('dialog', { name: 'Cancelar este pedido?' })
    const confirm = within(dialog).getByRole('button', { name: 'Cancelar pedido' })
    expect(confirm).toBeDisabled()
    await user.click(within(dialog).getByRole('radio', { name: 'Ausência de resposta' }))
    expect(confirm).toBeEnabled()
    await user.click(confirm)

    const updated = await screen.findAllByRole('article')
    expect(await within(updated[2]!).findByText('Cancelado')).toHaveClass('text-danger')
  })

  it('o título do pedido leva aos detalhes', async () => {
    renderPage()
    const [first] = await screen.findAllByRole('article')
    expect(within(first!).getByRole('link', { name: 'Cálculo I — Guidorizzi, vol. 1' })).toHaveAttribute(
      'href',
      '/meus-pedidos/417',
    )
  })
})

describe('Meus pedidos · reembolso (provisório)', () => {
  it('mostra Em análise em amarelo e Reembolso aprovado', async () => {
    renderPage()
    const cards = await screen.findAllByRole('article')
    expect(within(cards[3]!).getByText('Em análise')).toHaveClass('text-warning')
    expect(within(cards[5]!).getByText('Reembolso aprovado')).toBeInTheDocument()
  })
})

describe('Meus pedidos · filtros de status', () => {
  // A lista de exemplo é compartilhada entre os testes do arquivo (outros já cancelaram/concluíram
  // pedidos), então a contagem é lida do próprio botão em vez de fixa.
  it('filtra pelo status clicado, mostra a contagem e volta para Todos', async () => {
    renderPage()
    const user = userEvent.setup()
    const all = await screen.findAllByRole('article')
    const group = screen.getByRole('group', { name: 'Filtrar pedidos por status' })

    const todos = within(group).getByRole('button', { name: /Todos/ })
    expect(todos).toHaveAttribute('aria-pressed', 'true')
    expect(todos).toHaveTextContent(`(${all.length})`)

    const completed = within(group).getByRole('button', { name: /Concluído/ })
    const expected = Number(/\((\d+)\)/.exec(completed.textContent ?? '')![1])
    await user.click(completed)
    expect(completed).toHaveAttribute('aria-pressed', 'true')
    for (const card of screen.getAllByRole('article')) {
      expect(within(card).getByText('Concluído')).toBeInTheDocument()
    }
    expect(screen.getAllByRole('article')).toHaveLength(expected)

    await user.click(within(group).getByRole('button', { name: /Em análise/ }))
    expect(screen.getByRole('article')).toHaveAttribute('aria-label', 'Fone de ouvido Bluetooth JBL')

    await user.click(todos)
    expect(screen.getAllByRole('article')).toHaveLength(all.length)
  })
})

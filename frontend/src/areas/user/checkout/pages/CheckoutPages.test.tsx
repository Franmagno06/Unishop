import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearToken, setToken } from '../../../../shared/lib/session'
import {
  createOrder,
  payWithCard,
  resetOrdersForTests,
  simulateOrderExpiry,
  TEST_CARDS,
} from '../../orders/services/orders.service'
import { OrderConfirmedPage } from './OrderConfirmedPage'
import { PaymentPage } from './PaymentPage'

const demo = vi.hoisted(() => ({ on: true }))
vi.mock('../../../../shared/lib/mock-mode', () => ({
  get MOCK_MODE() {
    return demo.on
  },
}))

beforeEach(() => {
  setToken('t', 'student')
  resetOrdersForTests()
  demo.on = true
})
afterEach(() => clearToken())

let currentRouter: ReturnType<typeof createMemoryRouter>

function renderApp(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/pagamento/:pedidoId', element: <PaymentPage /> },
      { path: '/pedido-confirmado/:pedidoId', element: <OrderConfirmedPage /> },
      { path: '/produtos/:id', element: <h1>Produto</h1> },
      { path: '/categorias', element: <h1>Categorias</h1> },
      { path: '/meus-pedidos', element: <h1>Meus pedidos</h1> },
    ],
    { initialEntries: [path] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  currentRouter = router
  return { router, queryClient }
}

async function fillCard(number: string) {
  await userEvent.type(screen.getByLabelText('Número do cartão'), number)
  await userEvent.type(screen.getByLabelText('Nome impresso no cartão'), 'Aluno Teste')
  await userEvent.type(screen.getByLabelText('Validade'), '1299')
  await userEvent.type(screen.getByLabelText('CVV'), '123')
}

const payButton = /^Pagar R\$\s45,00$/
const where = () => currentRouter.state.location.pathname

describe('PaymentPage · tela', () => {
  it('mostra título, voltar, aviso de demonstração, abas, formulário e resumo (Figma 09a)', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    renderApp(`/pagamento/${order.id}`)

    await screen.findByLabelText('Número do cartão')
    expect(screen.getByRole('heading', { level: 1, name: 'Pagamento' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar ao produto' })).toHaveAttribute('href', '/produtos/1')
    expect(screen.getByText('Ambiente de demonstração')).toBeInTheDocument() // RN-PAG-15
    expect(screen.getByRole('heading', { name: 'Como você quer pagar?' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Cartão de crédito' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Número do cartão')).toBeInTheDocument()

    const summary = screen.getByRole('region', { name: 'Resumo do pedido' })
    expect(summary).toHaveTextContent('Cálculo I — Guidorizzi, vol. 1')
    expect(summary).toHaveTextContent('Vendido por Ana Lima')
    expect(screen.getByRole('button', { name: payButton })).toBeInTheDocument()
    expect(document.title).toBe('Pagamento · Unishop')
  })

  it('pedido inexistente e endereço inválido: "Pedido não encontrado"', async () => {
    renderApp('/pagamento/999')
    expect(await screen.findByRole('heading', { name: 'Pedido não encontrado' })).toBeInTheDocument()
  })

  it('endereço com id inválido também não encontra o pedido', async () => {
    renderApp('/pagamento/abc')
    expect(await screen.findByRole('heading', { name: 'Pedido não encontrado' })).toBeInTheDocument()
  })
})

describe('PaymentPage · cartão', () => {
  it('cartão aprovado leva à confirmação e o pedido fica Pago', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    renderApp(`/pagamento/${order.id}`)
    await screen.findByLabelText('Número do cartão')

    await fillCard(TEST_CARDS.approved)
    await userEvent.click(screen.getByRole('button', { name: payButton }))

    expect(await screen.findByRole('heading', { name: 'Pagamento confirmado!' })).toBeInTheDocument()
    expect(where()).toBe('/pedido-confirmado/417')
    expect(screen.getByText('#UNI-2026-0417')).toBeInTheDocument()
  })

  it('enquanto processa, o botão fica travado e avisa', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    renderApp(`/pagamento/${order.id}`)
    await screen.findByLabelText('Número do cartão')
    await fillCard(TEST_CARDS.approved)

    await userEvent.click(screen.getByRole('button', { name: payButton }))
    expect(screen.getByRole('button', { name: 'Processando…' })).toBeDisabled()
    await screen.findByRole('heading', { name: 'Pagamento confirmado!' })
  })

  it('cartão recusado: mostra o erro, mantém a tela e deixa tentar de novo no mesmo pedido (RN-PAG-07)', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    renderApp(`/pagamento/${order.id}`)
    await screen.findByLabelText('Número do cartão')

    await fillCard(TEST_CARDS.declined)
    await userEvent.click(screen.getByRole('button', { name: payButton }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Não foi possível pagar')
    expect(alert).toHaveTextContent('O pagamento foi recusado')
    expect(where()).toBe('/pagamento/417')
    expect(screen.getByRole('button', { name: payButton })).toBeEnabled()
    await waitFor(() => expect(screen.getByLabelText('Número do cartão')).toHaveFocus())

    const number = screen.getByLabelText('Número do cartão')
    await userEvent.clear(number)
    await userEvent.type(number, TEST_CARDS.approved)
    await userEvent.click(screen.getByRole('button', { name: payButton }))
    expect(await screen.findByRole('heading', { name: 'Pagamento confirmado!' })).toBeInTheDocument()
  })

  it('sem estoque na liquidação: leva à tela com o aviso de estorno (RN-PAG-08)', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    renderApp(`/pagamento/${order.id}`)
    await screen.findByLabelText('Número do cartão')

    await fillCard(TEST_CARDS.outOfStock)
    await userEvent.click(screen.getByRole('button', { name: payButton }))

    expect(await screen.findByRole('heading', { name: 'Pedido cancelado' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Seu valor será estornado')
    expect(where()).toBe('/pedido-confirmado/417')
  })

  it('os dados do cartão não ficam no cache, no armazenamento nem na URL (RN-PAG-02)', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    const { queryClient } = renderApp(`/pagamento/${order.id}`)
    await screen.findByLabelText('Número do cartão')
    await fillCard(TEST_CARDS.approved)
    await userEvent.click(screen.getByRole('button', { name: payButton }))
    await screen.findByRole('heading', { name: 'Pagamento confirmado!' })

    const cached = JSON.stringify(queryClient.getQueryCache().getAll().map((query) => query.state.data))
    expect(cached).not.toContain(TEST_CARDS.approved)
    expect(cached).not.toContain('Aluno Teste')
    expect(queryClient.getMutationCache().getAll().map((mutation) => JSON.stringify(mutation.state.variables))).not.toContain(
      expect.stringContaining(TEST_CARDS.approved),
    )
    expect(JSON.stringify({ ...sessionStorage })).not.toContain(TEST_CARDS.approved)
    expect(where()).not.toContain('4111')
  })
})

describe('PaymentPage · Pix', () => {
  it('a aba Pix gera o código e mostra o contador (Figma 09b)', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    renderApp(`/pagamento/${order.id}`)
    await userEvent.click(await screen.findByRole('tab', { name: 'Pix' }))

    expect(await screen.findByRole('heading', { name: 'Pague com Pix em segundos' })).toBeInTheDocument()
    const code = screen.getByLabelText<HTMLInputElement>('Código Pix copia e cola')
    expect(code.value).toMatch(/^00020126580014br\.gov\.bcb\.pix/)
    expect(screen.getByRole('button', { name: 'Já paguei' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /^Pagar/ })).not.toBeInTheDocument()
  })

  it('"Já paguei" leva à confirmação', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    renderApp(`/pagamento/${order.id}`)
    await userEvent.click(await screen.findByRole('tab', { name: 'Pix' }))
    await screen.findByRole('heading', { name: 'Pague com Pix em segundos' })

    await userEvent.click(screen.getByRole('button', { name: 'Já paguei' }))
    expect(await screen.findByRole('heading', { name: 'Pagamento confirmado!' })).toBeInTheDocument()
    expect(where()).toBe('/pedido-confirmado/417')
  })

  it('voltar ao cartão e ao Pix não cria outro código', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    renderApp(`/pagamento/${order.id}`)
    await userEvent.click(await screen.findByRole('tab', { name: 'Pix' }))
    const first = (await screen.findByLabelText('Código Pix copia e cola')) as HTMLInputElement
    const code = first.value

    await userEvent.click(screen.getByRole('tab', { name: 'Cartão de crédito' }))
    await userEvent.click(screen.getByRole('tab', { name: 'Pix' }))
    expect(await screen.findByLabelText('Código Pix copia e cola')).toHaveValue(code)
  })

  it('"Simular Pix expirado" (só na demonstração) cancela o pedido e oferece um novo (RN-PAG-04)', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    renderApp(`/pagamento/${order.id}`)
    await userEvent.click(await screen.findByRole('tab', { name: 'Pix' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Simular Pix expirado' }))

    expect(await screen.findByRole('heading', { name: 'Pedido cancelado' })).toBeInTheDocument()
    expect(screen.getByText(/prazo de 30 minutos/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Fazer um novo pedido' })).toHaveAttribute('href', '/produtos/1')
    expect(screen.queryByLabelText('Código Pix copia e cola')).not.toBeInTheDocument()
  })

  it('fora do modo de demonstração, o controle de teste não aparece', async () => {
    demo.on = false
    const order = await createOrder({ listingId: 1, quantity: 1 })
    renderApp(`/pagamento/${order.id}`)
    await userEvent.click(await screen.findByRole('tab', { name: 'Pix' }))
    await screen.findByLabelText('Código Pix copia e cola')
    expect(screen.queryByRole('button', { name: 'Simular Pix expirado' })).not.toBeInTheDocument()
  })
})

describe('PaymentPage · estados do pedido', () => {
  it('pedido já vencido: "Pedido cancelado", sem formulário', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    await simulateOrderExpiry(order.id)
    renderApp(`/pagamento/${order.id}`)

    expect(await screen.findByRole('heading', { name: 'Pedido cancelado' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Número do cartão')).not.toBeInTheDocument()
    expect(screen.getByText('Ambiente de demonstração')).toBeInTheDocument()
  })

  it('pedido já pago: vai direto para a confirmação (RN-PAG-11)', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    await payWithCard(order.id, { number: TEST_CARDS.approved, holder: 'Aluno Teste', expiry: '12/99', cvv: '123' })
    renderApp(`/pagamento/${order.id}`)

    expect(await screen.findByRole('heading', { name: 'Pagamento confirmado!' })).toBeInTheDocument()
    expect(where()).toBe('/pedido-confirmado/417')
  })

  it('carregando: mostra o esqueleto com aviso para leitor de tela', () => {
    renderApp('/pagamento/417')
    expect(screen.getByText('Carregando pedido…')).toBeInTheDocument()
  })
})

describe('OrderConfirmedPage · estados', () => {
  it('pedido pago: confirma, com número, item, total e contato (Figma 10)', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    await payWithCard(order.id, { number: TEST_CARDS.approved, holder: 'Aluno Teste', expiry: '12/99', cvv: '123' })
    renderApp(`/pedido-confirmado/${order.id}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Pagamento confirmado!' })).toBeInTheDocument()
    expect(screen.getByText('#UNI-2026-0417')).toBeInTheDocument()
    expect(screen.getByText('Total pago').nextSibling).toHaveTextContent('R$ 45,00')
    expect(document.title).toBe('Pagamento confirmado · Unishop')

    await userEvent.click(screen.getByRole('link', { name: 'Continuar comprando' }))
    expect(await screen.findByRole('heading', { name: 'Categorias' })).toBeInTheDocument()
  })

  it('"Ver meus pedidos" leva a /meus-pedidos', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    await payWithCard(order.id, { number: TEST_CARDS.approved, holder: 'Aluno Teste', expiry: '12/99', cvv: '123' })
    renderApp(`/pedido-confirmado/${order.id}`)
    await userEvent.click(await screen.findByRole('link', { name: 'Ver meus pedidos' }))
    expect(where()).toBe('/meus-pedidos')
  })

  it('pedido ainda pendente: nunca diz "pago"; volta ao pagamento (RN-PAG-11)', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    renderApp(`/pedido-confirmado/${order.id}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Pagamento' })).toBeInTheDocument()
    expect(where()).toBe('/pagamento/417')
    expect(screen.queryByText('Pagamento confirmado!')).not.toBeInTheDocument()
  })

  it('cancelado por falta de estoque depois do pagamento: aviso de estorno', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    await payWithCard(order.id, { number: TEST_CARDS.outOfStock, holder: 'Aluno Teste', expiry: '12/99', cvv: '123' })
    renderApp(`/pedido-confirmado/${order.id}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Pedido cancelado' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('será estornado')
    expect(document.title).toBe('Pedido cancelado · Unishop')
  })

  it('pedido inexistente: "Pedido não encontrado"', async () => {
    renderApp('/pedido-confirmado/999')
    expect(await screen.findByRole('heading', { name: 'Pedido não encontrado' })).toBeInTheDocument()
  })

  it('pedido vencido (não pago e não estornado) não vira confirmação', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    await simulateOrderExpiry(order.id)
    renderApp(`/pedido-confirmado/${order.id}`)
    expect(await screen.findByRole('heading', { name: 'Pedido sem pagamento' })).toBeInTheDocument()
    expect(screen.queryByText('Pagamento confirmado!')).not.toBeInTheDocument()
  })
})

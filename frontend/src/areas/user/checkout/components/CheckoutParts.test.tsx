import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Order, PixCharge } from '../../orders/types/order.types'
import { CardPaymentForm } from './CardPaymentForm'
import { OrderPaidCard } from './OrderPaidCard'
import { OrderRefundedCard } from './OrderRefundedCard'
import { OrderSummary } from './OrderSummary'
import { PaymentMethodTabs, type PaymentMethod } from './PaymentMethodTabs'
import { PixPayment } from './PixPayment'

const order: Order = {
  id: 417,
  number: 'UNI-2026-0417',
  status: 'pending',
  listingId: 1,
  title: 'Cálculo I — Guidorizzi, vol. 1',
  imageUrl: null,
  seller: { name: 'Ana Lima', whatsapp: '85999990000' },
  quantity: 1,
  unitPriceInCents: 4500,
  feeInCents: 0,
  totalInCents: 4500,
  createdAt: '2026-10-22T12:00:00.000Z',
  expiresAt: '2026-10-22T12:30:00.000Z',
  cancelReason: null,
  refunded: false,
}

afterEach(() => vi.useRealTimers())

describe('OrderSummary (RN-PAG-09)', () => {
  it('mostra item, vendedor, produto, taxa e total, com o botão recebido', () => {
    render(
      <OrderSummary order={order}>
        <button type="button">Pagar R$ 45,00</button>
      </OrderSummary>,
    )
    const summary = screen.getByRole('region', { name: 'Resumo do pedido' })
    expect(within(summary).getByText('Cálculo I — Guidorizzi, vol. 1')).toBeInTheDocument()
    expect(within(summary).getByText('Vendido por Ana Lima')).toBeInTheDocument()
    expect(within(summary).getByText('Produto').nextSibling).toHaveTextContent('R$ 45,00')
    expect(within(summary).getByText('Taxa de serviço').nextSibling).toHaveTextContent('R$ 0,00')
    expect(within(summary).getByText('Total').nextSibling).toHaveTextContent('R$ 45,00')
    expect(within(summary).getByRole('button', { name: 'Pagar R$ 45,00' })).toBeInTheDocument()
    expect(within(summary).getByText(/Retirada combinada com o\(a\) vendedor\(a\)/)).toBeInTheDocument()
  })

  it('com mais de uma unidade, mostra a quantidade e o subtotal', () => {
    render(
      <OrderSummary order={{ ...order, quantity: 3, totalInCents: 13500 }}>
        <span />
      </OrderSummary>,
    )
    expect(screen.getByText('Produto (3 un.)').nextSibling).toHaveTextContent('R$ 135,00')
  })
})

function TabsHarness() {
  const [method, setMethod] = useState<PaymentMethod>('card')
  return (
    <PaymentMethodTabs method={method} onMethodChange={setMethod}>
      <p>{method === 'card' ? 'Painel do cartão' : 'Painel do Pix'}</p>
    </PaymentMethodTabs>
  )
}

describe('PaymentMethodTabs', () => {
  it('começa no cartão, com as abas e o painel ligados por aria', () => {
    render(<TabsHarness />)
    const cardTab = screen.getByRole('tab', { name: 'Cartão de crédito' })
    expect(cardTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Pix' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tabpanel', { name: 'Cartão de crédito' })).toHaveTextContent('Painel do cartão')
  })

  it('clicar em Pix troca o painel', async () => {
    render(<TabsHarness />)
    await userEvent.click(screen.getByRole('tab', { name: 'Pix' }))
    expect(screen.getByRole('tabpanel', { name: 'Pix' })).toHaveTextContent('Painel do Pix')
  })

  it('setas, Home e End trocam de aba e levam o foco junto', async () => {
    render(<TabsHarness />)
    screen.getByRole('tab', { name: 'Cartão de crédito' }).focus()

    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Pix' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Pix' })).toHaveAttribute('aria-selected', 'true')

    await userEvent.keyboard('{ArrowRight}') // dá a volta
    expect(screen.getByRole('tab', { name: 'Cartão de crédito' })).toHaveFocus()

    await userEvent.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Pix' })).toHaveFocus()
    await userEvent.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Cartão de crédito' })).toHaveFocus()
  })

  it('só a aba escolhida entra na ordem do Tab', () => {
    render(<TabsHarness />)
    expect(screen.getByRole('tab', { name: 'Cartão de crédito' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Pix' })).toHaveAttribute('tabindex', '-1')
  })
})

describe('CardPaymentForm (RN-PAG-02, 03 e 07)', () => {
  function renderForm(onSubmit = vi.fn(), submitError: string | null = null) {
    render(
      <>
        <CardPaymentForm formId="f" totalInCents={4500} onSubmit={onSubmit} submitError={submitError} />
        <button type="submit" form="f">
          Pagar
        </button>
      </>,
    )
    return onSubmit
  }

  it('tem os cinco campos, com rótulo e atributos de preenchimento automático', () => {
    renderForm()
    expect(screen.getByLabelText('Número do cartão')).toHaveAttribute('autocomplete', 'cc-number')
    expect(screen.getByLabelText('Número do cartão')).toHaveAttribute('inputmode', 'numeric')
    expect(screen.getByLabelText('Nome impresso no cartão')).toHaveAttribute('autocomplete', 'cc-name')
    expect(screen.getByLabelText('Validade')).toHaveAttribute('autocomplete', 'cc-exp')
    expect(screen.getByLabelText('CVV')).toHaveAttribute('autocomplete', 'cc-csc')
    const installments = screen.getByLabelText('Parcelas')
    expect(within(installments).getAllByRole('option')).toHaveLength(1)
    expect(screen.getByRole('option', { name: /^À vista · R\$\s45,00$/ })).toBeInTheDocument()
    expect(screen.getByText(/O Unishop não armazena os dados do seu cartão/)).toBeInTheDocument()
  })

  it('aplica as máscaras ao digitar', async () => {
    renderForm()
    await userEvent.type(screen.getByLabelText('Número do cartão'), '4111111111111111')
    await userEvent.type(screen.getByLabelText('Validade'), '1299')
    await userEvent.type(screen.getByLabelText('CVV'), '12a3')
    expect(screen.getByLabelText('Número do cartão')).toHaveValue('4111 1111 1111 1111')
    expect(screen.getByLabelText('Validade')).toHaveValue('12/99')
    expect(screen.getByLabelText('CVV')).toHaveValue('123')
  })

  it('vazio, mostra um erro por campo e não envia', async () => {
    const onSubmit = renderForm()
    await userEvent.click(screen.getByRole('button', { name: 'Pagar' }))

    expect(await screen.findByText('Informe o número do cartão.')).toBeInTheDocument()
    expect(screen.getByText('Informe o nome impresso no cartão.')).toBeInTheDocument()
    expect(screen.getByText('Informe a validade.')).toBeInTheDocument()
    expect(screen.getByText('Informe o CVV.')).toBeInTheDocument()
    expect(screen.getByLabelText('Número do cartão')).toBeInvalid()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('cartão vencido e número com erro de digitação são recusados', async () => {
    const onSubmit = renderForm()
    await userEvent.type(screen.getByLabelText('Número do cartão'), '4111111111111112')
    await userEvent.type(screen.getByLabelText('Nome impresso no cartão'), 'Aluno Teste')
    await userEvent.type(screen.getByLabelText('Validade'), '0120')
    await userEvent.type(screen.getByLabelText('CVV'), '123')
    await userEvent.click(screen.getByRole('button', { name: 'Pagar' }))

    expect(await screen.findByText('Confira o número do cartão: ele parece inválido.')).toBeInTheDocument()
    expect(screen.getByText('Este cartão está vencido.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('preenchido, envia os dados', async () => {
    const onSubmit = renderForm()
    await userEvent.type(screen.getByLabelText('Número do cartão'), '4111111111111111')
    await userEvent.type(screen.getByLabelText('Nome impresso no cartão'), 'Aluno Teste')
    await userEvent.type(screen.getByLabelText('Validade'), '1299')
    await userEvent.type(screen.getByLabelText('CVV'), '123')
    await userEvent.click(screen.getByRole('button', { name: 'Pagar' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0]![0]).toEqual({
      number: '4111 1111 1111 1111',
      holder: 'Aluno Teste',
      expiry: '12/99',
      cvv: '123',
    })
  })

  it('recusado: anuncia o erro e leva o foco ao número do cartão (RN-PAG-07)', async () => {
    renderForm(vi.fn(), 'O pagamento foi recusado. Confira os dados ou use outro cartão.')
    expect(screen.getByRole('alert')).toHaveTextContent('O pagamento foi recusado')
    await waitFor(() => expect(screen.getByLabelText('Número do cartão')).toHaveFocus())
  })
})

describe('PixPayment (RN-PAG-04)', () => {
  const futureCharge = (seconds: number): PixCharge => ({
    code: '00020126580014br.gov.bcb.pix0136demo',
    expiresAt: new Date(Date.now() + seconds * 1000).toISOString(),
  })

  it('mostra QR Code, os passos, o código e o contador', () => {
    render(<PixPayment charge={futureCharge(1800)} onExpire={vi.fn()} />)

    expect(screen.getByRole('img', { name: 'QR Code do Pix (exemplo)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pague com Pix em segundos' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByLabelText('Código Pix copia e cola')).toHaveValue('00020126580014br.gov.bcb.pix0136demo')
    expect(screen.getByText('30:00')).toBeInTheDocument()
  })

  it('"Copiar" põe o código na área de transferência e avisa', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<PixPayment charge={futureCharge(1800)} onExpire={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Copiar' }))
    expect(writeText).toHaveBeenCalledWith('00020126580014br.gov.bcb.pix0136demo')
    expect(await screen.findByText('Código copiado!')).toBeInTheDocument()
  })

  it('se a cópia falhar, orienta a copiar à mão', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('negado'))
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<PixPayment charge={futureCharge(1800)} onExpire={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Copiar' }))
    expect(await screen.findByText(/Não foi possível copiar/)).toBeInTheDocument()
  })

  it('o contador desce e, no zero, chama onExpire uma única vez', () => {
    vi.useFakeTimers()
    const onExpire = vi.fn()
    render(<PixPayment charge={futureCharge(3)} onExpire={onExpire} />)
    expect(screen.getByText('00:03')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText('00:02')).toBeInTheDocument()
    expect(onExpire).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByText('00:00')).toBeInTheDocument()
    expect(onExpire).toHaveBeenCalledTimes(1)
  })
})

describe('OrderPaidCard (Figma 10 · RN-PED-03)', () => {
  it('mostra o título, o número, o item, o total pago e o contato do vendedor', () => {
    render(
      <MemoryRouter>
        <OrderPaidCard order={{ ...order, status: 'paid' }} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Pagamento confirmado!' })).toBeInTheDocument()
    expect(screen.getByText(/Ana Lima já foi avisado\(a\)/)).toBeInTheDocument()
    expect(screen.getByText('#UNI-2026-0417')).toBeInTheDocument()
    expect(screen.getByText('Cálculo I — Guidorizzi, vol. 1')).toBeInTheDocument()
    expect(screen.getByText('Total pago').nextSibling).toHaveTextContent('R$ 45,00')

    const contact = screen.getByRole('link', { name: /Contato do vendedor/ })
    expect(contact).toHaveAttribute('href', 'https://wa.me/5585999990000')
    expect(contact).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByRole('link', { name: 'Meus pedidos' })).toHaveAttribute('href', '/meus-pedidos')
    expect(screen.getByRole('link', { name: 'Continuar comprando' })).toHaveAttribute('href', '/categorias')
  })
})

describe('OrderRefundedCard (RN-PAG-08, 13 e 14)', () => {
  const refunded: Order = { ...order, status: 'cancelled', cancelReason: 'out_of_stock', refunded: true }

  it('avisa que o item acabou e que o valor será estornado', () => {
    render(
      <MemoryRouter>
        <OrderRefundedCard order={refunded} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Pedido cancelado' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Seu valor será estornado')
    expect(screen.getByRole('alert')).toHaveTextContent('O item acabou antes de o seu pagamento ser confirmado.')
    expect(screen.getByText('Valor a estornar').nextSibling).toHaveTextContent('R$ 45,00')
    expect(screen.queryByText('Pagamento confirmado!')).not.toBeInTheDocument()
  })

  it('anúncio que saiu do ar tem o motivo próprio', () => {
    render(
      <MemoryRouter>
        <OrderRefundedCard order={{ ...refunded, cancelReason: 'listing_unavailable' }} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('O anúncio deixou de estar disponível')
  })
})

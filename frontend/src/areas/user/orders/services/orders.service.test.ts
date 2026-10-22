import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../../shared/lib/api'
import { registerCreatedDetail } from '../../listings/services/listings.details'
import {
  confirmPixPayment,
  createOrder,
  createPixCharge,
  getOrderById,
  payWithCard,
  resetOrdersForTests,
  simulateOrderExpiry,
  TEST_CARDS,
} from './orders.service'

const card = (number: string) => ({ number, holder: 'Aluno Teste', expiry: '12/99', cvv: '123' })

beforeEach(() => resetOrdersForTests())
afterEach(() => vi.useRealTimers())

describe('createOrder (RN-PED-01, 02 e 10)', () => {
  it('cria o pedido do anúncio nº 1 com tudo congelado e o número #UNI-ano-0417', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })

    expect(order).toMatchObject({
      id: 417,
      status: 'pending',
      listingId: 1,
      title: 'Cálculo I — Guidorizzi, vol. 1',
      quantity: 1,
      unitPriceInCents: 4500,
      feeInCents: 0,
      totalInCents: 4500,
      seller: { name: 'Ana Lima' },
      cancelReason: null,
      refunded: false,
    })
    expect(order.number).toBe(`UNI-${new Date().getFullYear()}-0417`)
    expect(Date.parse(order.expiresAt) - Date.parse(order.createdAt)).toBe(30 * 60_000) // RN-PAG-12
  })

  it('reaproveita o pedido aberto do mesmo anúncio em vez de criar outro (RN-PED-10)', async () => {
    const first = await createOrder({ listingId: 1, quantity: 1 })
    const second = await createOrder({ listingId: 1, quantity: 1 })
    expect(second.id).toBe(first.id)

    const other = await createOrder({ listingId: 2, quantity: 1 })
    expect(other.id).toBe(first.id + 1)
  })

  it('atualiza a quantidade e o total do pedido reaproveitado', async () => {
    await createOrder({ listingId: 5, quantity: 1 }) // o anúncio nº 5 tem 3 unidades
    const updated = await createOrder({ listingId: 5, quantity: 2 })
    expect(updated.quantity).toBe(2)
    expect(updated.totalInCents).toBe(updated.unitPriceInCents * 2)
  })

  it('anúncio inexistente: 409 LISTING_UNAVAILABLE', async () => {
    await expect(createOrder({ listingId: 99999, quantity: 1 })).rejects.toMatchObject({
      status: 409,
      code: 'LISTING_UNAVAILABLE',
    })
  })

  it('quantidade acima do estoque: 409 OUT_OF_STOCK (RN-EST-02)', async () => {
    await expect(createOrder({ listingId: 1, quantity: 2 })).rejects.toMatchObject({ code: 'OUT_OF_STOCK' })
  })

  it('o próprio anúncio: 403 OWN_LISTING (RN-ANU-10)', async () => {
    registerCreatedDetail({
      id: 777,
      title: 'Meu item',
      priceInCents: 1000,
      description: 'Descrição do meu item.',
      quantity: 1,
      categoryId: 1,
      images: [],
      seller: { name: 'Aluno Teste', course: null },
      isOwn: true,
    })
    await expect(createOrder({ listingId: 777, quantity: 1 })).rejects.toMatchObject({
      status: 403,
      code: 'OWN_LISTING',
    })
  })
})

describe('getOrderById', () => {
  it('pedido inexistente: 404', async () => {
    await expect(getOrderById(123)).rejects.toBeInstanceOf(ApiError)
    await expect(getOrderById(123)).rejects.toMatchObject({ status: 404 })
  })

  it('pedido pendente passado de 30 minutos vira Cancelado por vencimento (RN-PAG-12)', async () => {
    vi.useFakeTimers()
    const order = await createOrder({ listingId: 1, quantity: 1 })
    expect((await getOrderById(order.id)).status).toBe('pending')

    vi.advanceTimersByTime(30 * 60_000 + 1000)
    expect(await getOrderById(order.id)).toMatchObject({ status: 'cancelled', cancelReason: 'expired', refunded: false })
  })

  it('depois de vencido, um novo clique cria outro pedido (RN-PAG-04)', async () => {
    const first = await createOrder({ listingId: 1, quantity: 1 })
    await simulateOrderExpiry(first.id)
    const next = await createOrder({ listingId: 1, quantity: 1 })
    expect(next.id).not.toBe(first.id)
  })
})

describe('payWithCard (RN-PAG-02, 07, 08 e 13)', () => {
  it('cartão aprovado deixa o pedido Pago', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    const paid = await payWithCard(order.id, card(TEST_CARDS.approved))
    expect(paid.status).toBe('paid')
    expect((await getOrderById(order.id)).status).toBe('paid')
  })

  it('cartão recusado: 402 PAYMENT_DECLINED e o pedido continua Pendente para tentar de novo', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    await expect(payWithCard(order.id, card(TEST_CARDS.declined))).rejects.toMatchObject({
      status: 402,
      code: 'PAYMENT_DECLINED',
    })
    expect((await getOrderById(order.id)).status).toBe('pending')

    expect((await payWithCard(order.id, card(TEST_CARDS.approved))).status).toBe('paid')
  })

  it('sem estoque na liquidação: cancela e estorna (RN-PAG-08)', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    const result = await payWithCard(order.id, card(TEST_CARDS.outOfStock))
    expect(result).toMatchObject({ status: 'cancelled', cancelReason: 'out_of_stock', refunded: true })
  })

  it('pedido cancelado não aceita pagamento: 409 ORDER_CANCELLED', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    await simulateOrderExpiry(order.id)
    await expect(payWithCard(order.id, card(TEST_CARDS.approved))).rejects.toMatchObject({
      status: 409,
      code: 'ORDER_CANCELLED',
    })
  })

  it('não guarda os dados do cartão no pedido', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    await payWithCard(order.id, card(TEST_CARDS.approved))
    const stored = JSON.stringify(await getOrderById(order.id))
    expect(stored).not.toContain(TEST_CARDS.approved)
    expect(stored).not.toContain('123')
  })
})

describe('Pix (RN-PAG-04)', () => {
  it('gera o código com a mesma validade do pedido e devolve a mesma cobrança ao repetir', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    const first = await createPixCharge(order.id)
    expect(first.code).toMatch(/^00020126580014br\.gov\.bcb\.pix/)
    expect(first.expiresAt).toBe(order.expiresAt)
    expect(await createPixCharge(order.id)).toEqual(first)
  })

  it('"Já paguei" marca o pedido como Pago (só na demonstração)', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    await createPixCharge(order.id)
    expect((await confirmPixPayment(order.id)).status).toBe('paid')
  })

  it('Pix de pedido vencido: 409 ORDER_CANCELLED, sem novo código', async () => {
    const order = await createOrder({ listingId: 1, quantity: 1 })
    await simulateOrderExpiry(order.id)
    await expect(createPixCharge(order.id)).rejects.toMatchObject({ code: 'ORDER_CANCELLED' })
  })
})

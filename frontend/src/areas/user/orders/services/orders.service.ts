import { ApiError } from '../../../../shared/lib/api'
import { getListingById } from '../../listings/services/listings.service'
import type { CardPaymentInput, NewOrder, Order, PixCharge } from '../types/order.types'

// Pedidos e pagamentos de exemplo (formato assumido de backend.md §9.5 e §9.6). Tudo fica em
// memória e some ao recarregar a página. Quando a API existir, só este arquivo muda: o cartão vira
// token no SDK do Mercado Pago e o pagamento é confirmado só pelo webhook (RN-PAG-02 e 05).

const PIX_MINUTES = 30 // validade do Pix e do pedido pendente (RN-PAG-04 e 12)
const FIRST_ORDER_ID = 417 // o pedido do Figma é o #UNI-2026-0417
const DEMO_SELLER_WHATSAPP = '85999990000'
const PROCESSING_MS = 400

// Cartões de teste da demonstração (RN-PAG-10). Qualquer outro número válido é aprovado.
export const TEST_CARDS = {
  approved: '4111111111111111',
  declined: '4000000000000002', // 402 PAYMENT_DECLINED (RN-PAG-07)
  outOfStock: '4000000000000119', // aprovado, mas o estoque acabou antes: cancela e estorna (RN-PAG-08)
} as const

const orders = new Map<number, Order>()
const pixCharges = new Map<number, PixCharge>()
let nextOrderId = FIRST_ORDER_ID

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function notFound(): ApiError {
  return new ApiError(404, 'NOT_FOUND', 'Pedido não encontrado.')
}

// Vencimento calculado na leitura: pedido pendente passado do prazo vira Cancelado (RN-PAG-12).
// Na API isso é do job expire-pix-payments.
function applyExpiry(order: Order): Order {
  if (order.status === 'pending' && Date.now() >= Date.parse(order.expiresAt)) {
    order.status = 'cancelled'
    order.cancelReason = 'expired'
  }
  return order
}

function requireOrder(orderId: number): Order {
  const order = orders.get(orderId)
  if (!order) throw notFound()
  return applyExpiry(order)
}

function requirePayable(orderId: number): Order {
  const order = requireOrder(orderId)
  if (order.status === 'cancelled') {
    throw new ApiError(409, 'ORDER_CANCELLED', 'Este pedido foi cancelado. Faça um novo pedido.')
  }
  return order
}

function totalOf(unitPriceInCents: number, quantity: number, feeInCents: number): number {
  return unitPriceInCents * quantity + feeInCents // RN-PED-02
}

// POST /orders (RN-PED-01, 02 e 10). Cria o pedido Pendente sem reservar estoque; se a pessoa já
// tem um pedido aberto desse anúncio, reaproveita (atualizando a quantidade).
export async function createOrder({ listingId, quantity }: NewOrder): Promise<Order> {
  const listing = await getListingById(listingId)
  if (!listing) {
    throw new ApiError(409, 'LISTING_UNAVAILABLE', 'Este anúncio não está mais disponível.')
  }
  if (listing.isOwn) {
    throw new ApiError(403, 'OWN_LISTING', 'Você não pode fazer pedido do seu próprio anúncio.') // RN-ANU-10
  }
  if (quantity < 1 || quantity > listing.quantity) {
    throw new ApiError(409, 'OUT_OF_STOCK', 'Não há unidades suficientes deste item.') // RN-EST-02
  }

  const open = [...orders.values()].find(
    (order) => order.listingId === listingId && applyExpiry(order).status === 'pending',
  )
  if (open) {
    open.quantity = quantity
    open.totalInCents = totalOf(open.unitPriceInCents, quantity, open.feeInCents)
    return { ...open }
  }

  const id = nextOrderId++
  const createdAt = new Date()
  const order: Order = {
    id,
    number: `UNI-${createdAt.getFullYear()}-${String(id).padStart(4, '0')}`,
    status: 'pending',
    listingId,
    title: listing.title,
    imageUrl: listing.images[0] ?? null,
    seller: { name: listing.seller.name, whatsapp: DEMO_SELLER_WHATSAPP },
    quantity,
    unitPriceInCents: listing.priceInCents,
    feeInCents: 0,
    totalInCents: totalOf(listing.priceInCents, quantity, 0),
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + PIX_MINUTES * 60_000).toISOString(),
    cancelReason: null,
    refunded: false,
  }
  orders.set(id, order)
  return { ...order }
}

// GET /orders/:id. É a fonte do "pago" que a tela mostra (RN-PAG-11).
export async function getOrderById(orderId: number, signal?: AbortSignal): Promise<Order> {
  signal?.throwIfAborted()
  return { ...requireOrder(orderId) }
}

// POST /payments/card. Os dados do cartão só passam por esta função; nada é guardado nem
// registrado (RN-PAG-02). Recusado: 402, e a pessoa tenta de novo no mesmo pedido (RN-PAG-07).
export async function payWithCard(orderId: number, card: CardPaymentInput): Promise<Order> {
  requirePayable(orderId)
  await delay(PROCESSING_MS)
  const order = requirePayable(orderId)

  const digits = card.number.replace(/\D/g, '')
  if (digits === TEST_CARDS.declined) {
    throw new ApiError(402, 'PAYMENT_DECLINED', 'O pagamento foi recusado. Confira os dados ou use outro cartão.')
  }
  if (digits === TEST_CARDS.outOfStock) {
    // Liquidação sem estoque: cancela e estorna o valor (RN-PAG-08, 13 e 14).
    order.status = 'cancelled'
    order.cancelReason = 'out_of_stock'
    order.refunded = true
    return { ...order }
  }
  order.status = 'paid'
  return { ...order }
}

// POST /payments/pix: gera a cobrança. Repetir a chamada devolve a mesma (um Pix em andamento por pedido).
export async function createPixCharge(orderId: number): Promise<PixCharge> {
  const order = requirePayable(orderId)
  const existing = pixCharges.get(orderId)
  if (existing) return { ...existing }
  const charge: PixCharge = {
    code: `00020126580014br.gov.bcb.pix0136demo-unishop-${orderId}5204000053039865802BR5909UNISHOP6009FORTALEZA6304ABCD`,
    expiresAt: order.expiresAt,
  }
  pixCharges.set(orderId, charge)
  return { ...charge }
}

// Botão "Já paguei" (Figma 09b). SÓ DA DEMONSTRAÇÃO: marca o pedido como Pago. Com a API, o botão
// apenas consulta GET /orders/:id e quem confirma é o webhook assinado (RN-PAG-05 e 11).
export async function confirmPixPayment(orderId: number): Promise<Order> {
  const order = requirePayable(orderId)
  await delay(PROCESSING_MS)
  order.status = 'paid'
  return { ...order }
}

// Controle da demonstração: vence o pedido na hora, para ver o estado "Pix expirado" (RN-PAG-04).
export async function simulateOrderExpiry(orderId: number): Promise<Order> {
  const order = requireOrder(orderId)
  order.expiresAt = new Date(Date.now() - 1000).toISOString()
  return { ...applyExpiry(order) }
}

// Só para os testes: zera pedidos e cobranças.
export function resetOrdersForTests(): void {
  orders.clear()
  pixCharges.clear()
  nextOrderId = FIRST_ORDER_ID
}

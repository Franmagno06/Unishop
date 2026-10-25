import { ApiError } from '../../../../shared/lib/api'
import type { ManagedListing, MyListing, ReceivedOrder } from '../types/my-listing.types'

// Dados de exemplo (os do Figma, telas 05 e 05d) no formato assumido do contrato de backend.md §9.
// Quando a API existir, só este arquivo muda. Tudo fica em memória para pausar, vender, excluir e
// mexer nos pedidos recebidos funcionar durante a demonstração. O anúncio 2 já começa pausado
// (o Figma 05e está em branco) e o 1 tem um pedido Pago, o que bloqueia a exclusão (RN-ANU-09).
const DELAY_MS = 250
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let listings: MyListing[] = [
  {
    id: 1,
    title: 'Cálculo I — Guidorizzi, vol. 1',
    description: 'Livro em ótimo estado, 5ª edição, sem rasuras e com poucas marcações a lápis.',
    priceInCents: 4500,
    categoryName: 'Livros e apostilas',
    status: 'active',
    publishedAt: '2026-09-10T14:00:00Z',
    whatsapp: '85991234567',
    contactLabel: 'Bloco D · 14h às 16h',
    imageUrl: null,
    views: 128,
    whatsappContacts: 9,
  },
  {
    id: 2,
    title: 'Calculadora HP 12C',
    description: 'Calculadora financeira em perfeito funcionamento, com capa e manual.',
    priceInCents: 12000,
    categoryName: 'Eletrônicos',
    status: 'paused',
    publishedAt: '2026-09-05T16:30:00Z',
    whatsapp: '85991234567',
    contactLabel: 'WhatsApp',
    imageUrl: null,
    views: 54,
    whatsappContacts: 3,
  },
]

let orders: Record<number, ReceivedOrder[]> = {
  1: [
    {
      id: 9001,
      buyerName: 'João Pereira',
      negotiation: 'site_payment',
      paymentMethod: 'Pix',
      createdAt: '2026-09-24T15:00:00Z',
      status: 'paid',
      buyerWhatsapp: '85988887777',
    },
    {
      id: 9002,
      buyerName: 'Larissa Moura',
      negotiation: 'whatsapp',
      paymentMethod: null,
      createdAt: '2026-09-22T13:00:00Z',
      status: 'negotiating',
      buyerWhatsapp: '85977776666',
    },
  ],
  2: [],
}

// Meus anúncios (RF012): os mais recentes primeiro (RN-ANU-07); excluídos não aparecem.
export async function getMyListings(signal?: AbortSignal): Promise<MyListing[]> {
  await wait(DELAY_MS)
  signal?.throwIfAborted()
  return [...listings].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

// null = anúncio que não existe, foi excluído ou é de outra pessoa (404, RN-ANU-04).
export async function getManagedListing(
  id: number,
  signal?: AbortSignal,
): Promise<ManagedListing | null> {
  await wait(DELAY_MS)
  signal?.throwIfAborted()
  const listing = listings.find((item) => item.id === id)
  return listing ? { listing, orders: orders[id] ?? [] } : null
}

function find(id: number): MyListing {
  const listing = listings.find((item) => item.id === id)
  if (!listing) throw new ApiError(404, 'LISTING_NOT_FOUND', 'Anúncio não encontrado.')
  return listing
}

function setStatus(id: number, from: MyListing['status'], to: MyListing['status']) {
  const listing = find(id)
  if (listing.status !== from) {
    throw new ApiError(409, 'INVALID_LISTING_STATE', 'O anúncio mudou de estado. Atualize a página.')
  }
  listings = listings.map((item) => (item.id === id ? { ...item, status: to } : item))
}

export async function pauseListing(id: number): Promise<void> {
  await wait(DELAY_MS)
  setStatus(id, 'active', 'paused')
}

export async function reactivateListing(id: number): Promise<void> {
  await wait(DELAY_MS)
  setStatus(id, 'paused', 'active')
}

// Vendido não volta a ativo (Regras §3; o pop-up avisa "Você não poderá reativá-lo").
export async function markListingAsSold(id: number): Promise<void> {
  await wait(DELAY_MS)
  const listing = find(id)
  if (listing.status === 'sold') {
    throw new ApiError(409, 'INVALID_LISTING_STATE', 'O anúncio mudou de estado. Atualize a página.')
  }
  listings = listings.map((item) => (item.id === id ? { ...item, status: 'sold' } : item))
}

// RN-ANU-09: bloqueada com pedido Pago ou em Retirada combinada em aberto; Pendente e Em
// negociação são cancelados. A exclusão é lógica: o anúncio só deixa de aparecer.
export async function deleteListing(id: number): Promise<void> {
  await wait(DELAY_MS)
  find(id)
  const open = (orders[id] ?? []).some((o) => o.status === 'paid' || o.status === 'pickup_arranged')
  if (open) {
    throw new ApiError(
      409,
      'HAS_OPEN_PAID_ORDERS',
      'Há pedidos pagos ou com retirada combinada em aberto.',
    )
  }
  listings = listings.filter((item) => item.id !== id)
}

function changeOrder(
  listingId: number,
  orderId: number,
  allowedFrom: ReceivedOrder['status'][],
  to: ReceivedOrder['status'],
) {
  const list = orders[listingId] ?? []
  const order = list.find((item) => item.id === orderId)
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Pedido não encontrado.')
  if (!allowedFrom.includes(order.status)) {
    throw new ApiError(409, 'INVALID_ORDER_STATE', 'O pedido mudou de estado. Atualize a página.')
  }
  orders = {
    ...orders,
    [listingId]: list.map((item) => (item.id === orderId ? { ...item, status: to } : item)),
  }
}

// RN-PED-08: o vendedor marca a retirada combinada de um pedido Pago.
export async function arrangePickup(listingId: number, orderId: number): Promise<void> {
  await wait(DELAY_MS)
  changeOrder(listingId, orderId, ['paid'], 'pickup_arranged')
}

// "Concluir venda" de uma negociação pelo WhatsApp. O desconto de estoque e o 409 por falta de
// estoque (RN-PED-13) são do servidor; aqui a conclusão sempre dá certo.
export async function completeSale(listingId: number, orderId: number): Promise<void> {
  await wait(DELAY_MS)
  changeOrder(listingId, orderId, ['negotiating'], 'completed')
}

// RN-PED-12: o vendedor encerra uma negociação (Em negociação para Cancelado).
export async function closeNegotiation(listingId: number, orderId: number): Promise<void> {
  await wait(DELAY_MS)
  changeOrder(listingId, orderId, ['negotiating'], 'cancelled')
}

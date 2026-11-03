import { ApiError, api } from '../../../../shared/lib/api'
import { MOCK_MODE } from '../../../../shared/lib/mock-mode'
import type { ManagedListing, MyListing, ReceivedOrder } from '../types/my-listing.types'

// Em modo de demonstração (MOCK_MODE; o `import.meta.env.DEV` escrito em cada função deixa o Vite apagar o exemplo do build) tudo vai para `my-listings.mock.ts`. Na API real:
// GET /listings/mine, GET /listings/:id/management, POST /listings/:id/pause|reactivate|mark-sold
// e DELETE /listings/:id (backend.md §9.4). Pedidos recebidos (RN-PED-07): GET /orders/received e
// POST /orders/:id/arrange-pickup|complete|cancel.

// Formato do dono (listings.serializer.ts, toOwnerView).
type ApiOwnerListing = {
  id: number
  title: string
  description: string
  priceInCents: number
  status: MyListing['status']
  categoryName: string
  publishedAt: string
  whatsapp: string
  imageUrl: string | null
  views: number
  whatsappContacts: number
}

// O anúncio só guarda o WhatsApp: o "contato" do Figma (bloco e horário) não existe no banco.
const toMyListing = (item: ApiOwnerListing): MyListing => ({
  id: item.id,
  title: item.title,
  description: item.description,
  priceInCents: item.priceInCents,
  categoryName: item.categoryName,
  status: item.status,
  publishedAt: item.publishedAt,
  whatsapp: item.whatsapp,
  contactLabel: 'WhatsApp',
  imageUrl: item.imageUrl,
  views: item.views,
  whatsappContacts: item.whatsappContacts,
})

// Pedido recebido como a API devolve em GET /orders/received (orders.serializer.ts).
type ApiReceivedOrder = {
  id: number
  status: ReceivedOrder['status']
  negotiation: ReceivedOrder['negotiation']
  buyer: { name: string }
  createdAt: string
  paymentMethod: 'pix' | 'card' | 'on_delivery' | null
}

// A API não expõe o WhatsApp do comprador: o botão some e o contato parte do comprador.
const toReceivedOrder = (o: ApiReceivedOrder): ReceivedOrder => ({
  id: o.id,
  buyerName: o.buyer.name,
  negotiation: o.negotiation,
  paymentMethod: o.paymentMethod === 'pix' ? 'Pix' : o.paymentMethod === 'card' ? 'Cartão' : null,
  createdAt: o.createdAt,
  status: o.status,
  buyerWhatsapp: '',
})

// Meus anúncios (RF012): os mais recentes primeiro (RN-ANU-07); excluídos não aparecem.
export async function getMyListings(signal?: AbortSignal): Promise<MyListing[]> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./my-listings.mock')).getMyListings(signal)
  const response = await api<{ data: ApiOwnerListing[] }>('/listings/mine', { signal })
  return response.data.map(toMyListing)
}

// null = anúncio que não existe, foi excluído ou é de outra pessoa (404, RN-ANU-04).
export async function getManagedListing(
  id: number,
  signal?: AbortSignal,
): Promise<ManagedListing | null> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./my-listings.mock')).getManagedListing(id, signal)
  try {
    const response = await api<{ data: { listing: ApiOwnerListing } }>(
      `/listings/${id}/management`,
      { signal },
    )
    const received = await api<{ data: ApiReceivedOrder[] }>(`/orders/received?listingId=${id}`, {
      signal,
    })
    return { listing: toMyListing(response.data.listing), orders: received.data.map(toReceivedOrder) }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export async function pauseListing(id: number): Promise<void> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./my-listings.mock')).pauseListing(id)
  await api(`/listings/${id}/pause`, { method: 'POST' })
}

export async function reactivateListing(id: number): Promise<void> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./my-listings.mock')).reactivateListing(id)
  await api(`/listings/${id}/reactivate`, { method: 'POST' })
}

// Vendido não volta a ativo (Regras §3; o pop-up avisa "Você não poderá reativá-lo").
export async function markListingAsSold(id: number): Promise<void> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./my-listings.mock')).markListingAsSold(id)
  await api(`/listings/${id}/mark-sold`, { method: 'POST' })
}

// RN-ANU-09: bloqueada com pedido Pago ou em Retirada combinada em aberto (409 HAS_OPEN_PAID_ORDERS).
export async function deleteListing(id: number): Promise<void> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./my-listings.mock')).deleteListing(id)
  await api(`/listings/${id}`, { method: 'DELETE' })
}

// RN-PED-08: o vendedor marca a retirada combinada de um pedido Pago.
export async function arrangePickup(listingId: number, orderId: number): Promise<void> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./my-listings.mock')).arrangePickup(listingId, orderId)
  await api(`/orders/${orderId}/arrange-pickup`, { method: 'POST' })
}

// "Concluir venda" de uma negociação pelo WhatsApp: desconta o estoque (409 se não bastar).
export async function completeSale(listingId: number, orderId: number): Promise<void> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./my-listings.mock')).completeSale(listingId, orderId)
  await api(`/orders/${orderId}/complete`, { method: 'POST' })
}

// RN-PED-12: o vendedor encerra uma negociação.
export async function closeNegotiation(listingId: number, orderId: number): Promise<void> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./my-listings.mock')).closeNegotiation(listingId, orderId)
  await api(`/orders/${orderId}/cancel`, { method: 'POST' })
}

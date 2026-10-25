import type { Negotiation, OrderStatus } from '../../orders/types/order.types'

// Estado do anúncio (banco `anuncio.status`): ativo, pausado e vendido. Excluir é lógico
// (`excluido_em`) e não é um estado (Regras §3).
export type ListingStatus = 'active' | 'paused' | 'sold'

// Anúncio do próprio aluno (Meus anúncios e Gerenciar anúncio), formato assumido de
// GET /listings/mine e GET /listings/:id (backend.md §9).
export type MyListing = {
  id: number
  title: string
  description: string
  priceInCents: number
  categoryName: string
  status: ListingStatus
  publishedAt: string // ISO (UTC)
  whatsapp: string // só dígitos
  // Texto de contato do Figma ("Bloco D · 14h às 16h", "WhatsApp"). Ainda não existe no banco
  // (ver listing.types.ts, ContactMode): fica nos dados de exemplo até o grupo decidir.
  contactLabel: string
  imageUrl: string | null
  views: number
  whatsappContacts: number
}

// Pedido recebido pelo vendedor (RN-PED-07): quem pediu, como negociou, quando e em que estado.
export type ReceivedOrder = {
  id: number
  buyerName: string
  negotiation: Negotiation
  paymentMethod: 'Pix' | 'Cartão' | null // só no pagamento pelo site
  createdAt: string
  status: OrderStatus
  buyerWhatsapp: string
}

export type ManagedListing = { listing: MyListing; orders: ReceivedOrder[] }

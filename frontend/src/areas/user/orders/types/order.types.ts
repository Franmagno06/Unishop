// Estados do pedido (Regras §3, banco `pedido.status_pedido`): o código escreve em inglês e o
// Prisma faz a ponte com os valores em português (pendente, pago, retirada_combinada...).
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'pickup_arranged'
  | 'completed'
  | 'negotiating'
  | 'cancelled'

// Forma de negociação do pedido: pagamento pelo site ou conversa pelo WhatsApp (RN-PED-04).
export type Negotiation = 'site_payment' | 'whatsapp'

// Pedido na visão do comprador (Meus pedidos, RN-PED-06). O pedido congela o produto, o preço e o
// vendedor (RF017.12), por isso os dados do anúncio vêm dentro dele.
export type BuyerOrder = {
  id: number
  code: string // "UNI-2026-0417" (RN-PED-03)
  listingTitle: string
  listingDescription: string
  imageUrl: string | null
  priceInCents: number
  status: OrderStatus
  negotiation: Negotiation
  createdAt: string // ISO (UTC)
  seller: { name: string; whatsapp: string } // WhatsApp só com dígitos
}

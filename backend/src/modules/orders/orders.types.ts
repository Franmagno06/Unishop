// Estados na API em inglês; o banco guarda em português e o repository converte (roteiro §2.1).
export type OrderStatus =
  'pending' | 'paid' | 'pickup_arranged' | 'completed' | 'negotiating' | 'cancelled'
export type Negotiation = 'site_payment' | 'whatsapp'
export type CancelReason = 'expired' | 'out_of_stock' | 'listing_unavailable'
export type PaymentMethod = 'pix' | 'card' | 'on_delivery'

export type OrderRecord = {
  id: number
  listingId: number
  buyerId: number
  sellerId: number
  negotiation: Negotiation
  status: OrderStatus
  productName: string
  imageUrl: string | null
  quantity: number
  unitPriceInCents: number
  feeInCents: number
  totalInCents: number
  createdAt: Date
  completedAt: Date | null
  cancelReason: CancelReason | null
  buyerName: string
  sellerName: string
  /** WhatsApp do anúncio. Só sai em rota autenticada (RN-PER-04). */
  sellerWhatsapp: string
  listingDescription: string
  /** Última tentativa de pagamento no site, se houver. */
  payment: { method: 'pix' | 'card'; status: string } | null
  /** Pagamento aprovado e depois estornado (RN-PAG-13). */
  refunded: boolean
}

export type ListingForOrder = {
  id: number
  ownerId: number
  ownerActive: boolean
  status: 'active' | 'paused' | 'sold'
  deleted: boolean
  quantity: number
  priceInCents: number
  title: string
  imageUrl: string | null
}

export type NewOrderData = {
  buyerId: number
  listing: ListingForOrder
  negotiation: Negotiation
  quantity: number
  feeInCents: number
}

export type CompleteResult = 'ok' | 'out_of_stock' | 'not_open'

export interface OrderRepository {
  findListing(listingId: number): Promise<ListingForOrder | null>
  /** +1 contato por WhatsApp, atômico (usado só quando o pedido é novo). */
  incrementContacts(listingId: number): Promise<void>
  /**
   * Cria o pedido aberto ou reaproveita o que já existe para (comprador, anúncio, forma), atualizando
   * quantidade e valores (RN-PED-10). O índice único `uq_pedido_aberto` decide a corrida.
   */
  createOrReuse(data: NewOrderData): Promise<{ order: OrderRecord; created: boolean }>
  /** Pedido aberto (Pendente ou Em negociação) do comprador neste anúncio e forma, se houver. */
  findOpen(
    buyerId: number,
    listingId: number,
    negotiation: Negotiation,
  ): Promise<OrderRecord | null>
  findById(id: number): Promise<OrderRecord | null>
  findByBuyer(buyerId: number): Promise<OrderRecord[]>
  findBySeller(sellerId: number, listingId?: number): Promise<OrderRecord[]>
  /** Muda o estado só se ainda estiver em um dos de origem; `false` se outra requisição chegou antes. */
  transition(id: number, from: OrderStatus[], to: OrderStatus): Promise<boolean>
  /** Conclui a negociação por WhatsApp e desconta o estoque, tudo em uma transação (RN-EST-03, 06). */
  completeNegotiation(id: number): Promise<CompleteResult>
  /** Conclui a retirada (comprador confirma o recebimento). */
  completePickup(id: number): Promise<boolean>
  /** Cancelamento do comprador ou do vendedor, só nos estados de origem. */
  cancel(id: number, from: OrderStatus[], reason?: CancelReason): Promise<boolean>
  /** Cancela por vencimento (RN-PAG-12) um Pendente criado antes do corte. */
  expire(id: number, createdBefore: Date): Promise<boolean>
  /** Ids dos pedidos Pendente vencidos (job). */
  findExpiredIds(createdBefore: Date): Promise<number[]>
  /** Cobrança aberta do pedido (pendente), para cancelar no gateway. */
  findPendingGatewayId(orderId: number): Promise<string | null>
}

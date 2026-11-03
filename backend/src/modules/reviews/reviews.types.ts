import type { OrderStatus } from '../orders/orders.types'

// Avaliação do item de um pedido concluído (RN-AVA-01 a 05). Nota em número (0 a 5, passos de 0,5).
export type ReviewRecord = {
  id: number
  listingId: number
  /** Nome do autor vindo do join; conta anonimizada aparece como "Usuário removido" (RN-PER-06). */
  authorName: string
  rating: number
  comment: string
  createdAt: Date
}

export type ReviewOrder = {
  id: number
  listingId: number
  buyerId: number
  status: OrderStatus
  /** Já existe avaliação deste pedido (RN-AVA-02). */
  reviewed: boolean
}

export interface ReviewRepository {
  findOrder(id: number): Promise<ReviewOrder | null>
  /** Lança 409 ALREADY_REVIEWED se a corrida pelo unique `uq_avaliacao_pedido` perder (RN-AVA-02). */
  create(input: {
    orderId: number
    listingId: number
    authorId: number
    rating: number
    comment: string
  }): Promise<ReviewRecord>
  listByListing(listingId: number): Promise<ReviewRecord[]>
  /** Anúncio existe e não foi excluído. */
  listingExists(listingId: number): Promise<boolean>
}

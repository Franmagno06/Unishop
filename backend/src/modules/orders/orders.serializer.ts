import type { OrderRecord } from './orders.types'

// Formato do pedido na API (inglês, centavos, datas ISO). Quem chama já provou ser comprador ou
// vendedor: o WhatsApp só sai em rota autenticada (RN-PER-04). Nunca sai dado de cartão (RN-PAG-02).
export function toOrderJson(order: OrderRecord, expiresAt: Date) {
  const paymentMethod =
    order.negotiation === 'whatsapp' ? 'on_delivery' : (order.payment?.method ?? null)
  return {
    id: order.id,
    number: `UNI-${order.createdAt.getUTCFullYear()}-${String(order.id).padStart(4, '0')}`, // RN-PED-03
    status: order.status,
    negotiation: order.negotiation,
    listingId: order.listingId,
    title: order.productName,
    description: order.listingDescription,
    imageUrl: order.imageUrl,
    seller: { id: order.sellerId, name: order.sellerName, whatsapp: order.sellerWhatsapp },
    buyer: { id: order.buyerId, name: order.buyerName },
    quantity: order.quantity,
    unitPriceInCents: order.unitPriceInCents,
    feeInCents: order.feeInCents,
    totalInCents: order.totalInCents,
    createdAt: order.createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    completedAt: order.completedAt?.toISOString() ?? null,
    cancelReason: order.cancelReason,
    refunded: order.refunded,
    paymentMethod,
  }
}
export type OrderJson = ReturnType<typeof toOrderJson>

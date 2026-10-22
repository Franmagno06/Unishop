import type { Order } from '../types/order.types'

// Só aceita número inteiro positivo ("abc", "0", "-1" e "1.5" não são pedidos).
export function parseOrderId(raw: string | undefined): number | null {
  return raw !== undefined && /^[1-9]\d{0,8}$/.test(raw) ? Number(raw) : null
}

// RN-PAG-11: a tela só mostra "pago" quando o pedido está Pago (ou já adiante) no backend.
export function isPaidOrder(order: Order): boolean {
  return order.status === 'paid' || order.status === 'pickup_arranged' || order.status === 'completed'
}

// Pedido cancelado depois de o pagamento ser aprovado: o valor é estornado (RN-PAG-08, 13 e 14).
export function isRefundedOrder(order: Order): boolean {
  return order.status === 'cancelled' && order.refunded
}

// Número como aparece na tela, com "#" na frente (Figma 10).
export function formatOrderNumber(order: Pick<Order, 'number'>): string {
  return `#${order.number}`
}

// Link do WhatsApp do vendedor (wa.me, DDI do Brasil). Só deve ser renderizado para aluno logado.
export function whatsappLink(whatsapp: string): string {
  return `https://wa.me/55${whatsapp.replace(/\D/g, '')}`
}

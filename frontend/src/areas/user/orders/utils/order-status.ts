import type { BadgeTone } from '../../../../shared/components/ui/Badge'
import type { BuyerCancelReason, OrderStatus, PaymentMethod } from '../types/order.types'

// Quem está olhando o pedido: o texto do estado "Pago" muda (comprador espera a retirada, vendedor
// precisa combiná-la), como no Figma 05c e 05d.
export type OrderPerspective = 'buyer' | 'seller'

export function orderStatusLabel(status: OrderStatus, perspective: OrderPerspective): string {
  switch (status) {
    case 'pending':
      return 'Pendente · aguardando pagamento'
    case 'paid':
      return perspective === 'buyer' ? 'Pago · aguardando retirada' : 'Pago · combinar retirada'
    case 'pickup_arranged':
      return 'Retirada combinada'
    case 'completed':
      return 'Concluído'
    case 'negotiating':
      return 'Em negociação'
    case 'cancelled':
      return 'Cancelado'
    case 'refund_review':
      return 'Em análise'
    case 'refund_approved':
      return 'Reembolso aprovado'
  }
}

// Filtros de status de "Meus pedidos" (parâmetro `?status=` na URL, em português). "Todos" não filtra.
// Pago junta Pago e Retirada combinada (os dois aguardam a retirada). Pedido Pendente e Cancelado só
// aparecem em "Todos". Os filtros de reembolso são provisórios (fora das Regras).
export type OrderFilter = 'all' | 'paid' | 'completed' | 'negotiating' | 'review' | 'refunded'

export const orderFilters: {
  value: OrderFilter
  param: string
  label: string
  statuses: OrderStatus[] | null
  tone: BadgeTone | null
}[] = [
  { value: 'all', param: '', label: 'Todos', statuses: null, tone: null },
  { value: 'paid', param: 'pago', label: 'Pago · aguardando retirada', statuses: ['paid', 'pickup_arranged'], tone: 'info' },
  { value: 'completed', param: 'concluido', label: 'Concluído', statuses: ['completed'], tone: 'done' },
  { value: 'negotiating', param: 'negociacao', label: 'Em negociação', statuses: ['negotiating'], tone: 'info' },
  { value: 'review', param: 'analise', label: 'Em análise', statuses: ['refund_review'], tone: 'warning' },
  { value: 'refunded', param: 'reembolso', label: 'Reembolsos', statuses: ['refund_approved'], tone: 'info' },
]

export const cancelReasonLabels: Record<BuyerCancelReason, string> = {
  late_delivery: 'Atraso na entrega',
  negotiation_problems: 'Problemas na negociação',
  no_response: 'Ausência de resposta',
  changed_mind: 'Mudei de ideia',
  ordered_by_mistake: 'Fiz o pedido por engano',
  other: 'Outros',
}

// Motivos por tipo de cancelamento: antes do pagamento e depois dele (pedido Pago).
export const unpaidCancelReasons: BuyerCancelReason[] = [
  'late_delivery',
  'negotiation_problems',
  'no_response',
  'other',
]
export const paidCancelReasons: BuyerCancelReason[] = [
  'changed_mind',
  'ordered_by_mistake',
  'late_delivery',
  'no_response',
  'other',
]

// Prazo do reembolso por forma de pagamento. NÃO definido nas Regras nem no Mercado Pago do projeto:
// valores de exemplo da demonstração, a confirmar com o grupo.
export const refundDeadlineLabels: Record<'pix' | 'card', string> = {
  pix: 'até 1 dia útil',
  card: 'até 30 dias, conforme o fechamento da fatura',
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  pix: 'Pix',
  card: 'Cartão',
  on_delivery: 'Pagamento na entrega',
}

export function orderStatusTone(status: OrderStatus): BadgeTone {
  if (status === 'completed') return 'done'
  if (status === 'cancelled') return 'danger'
  if (status === 'refund_review') return 'warning'
  return 'info'
}

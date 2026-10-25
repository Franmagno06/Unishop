import type { BadgeTone } from '../../../../shared/components/ui/Badge'
import type { OrderStatus } from '../types/order.types'

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
  }
}

export function orderStatusTone(status: OrderStatus): BadgeTone {
  if (status === 'completed') return 'neutral'
  if (status === 'cancelled') return 'danger'
  return 'info'
}

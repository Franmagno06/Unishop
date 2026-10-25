import { Badge } from '../../../../shared/components/ui/Badge'
import type { OrderStatus } from '../types/order.types'
import { orderStatusLabel, orderStatusTone, type OrderPerspective } from '../utils/order-status'

export function OrderStatusBadge({
  status,
  perspective,
}: {
  status: OrderStatus
  perspective: OrderPerspective
}) {
  return <Badge tone={orderStatusTone(status)}>{orderStatusLabel(status, perspective)}</Badge>
}

import type { ReactNode } from 'react'
import { Card } from '../../../../shared/components/ui/Card'
import { formatCurrency } from '../../../../shared/utils/format-currency'
import type { Order } from '../../orders/types/order.types'

type OrderSummaryProps = {
  order: Order
  // Botão de ação da tela ("Pagar R$ 45,00" ou "Já paguei"): quem monta a tela escolhe.
  children: ReactNode
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-[13px] text-text-muted">
      <dt>{label}</dt>
      <dd className="text-text">{value}</dd>
    </div>
  )
}

// RN-PAG-09 (Figma 09a e 09b): item, vendedor, subtotal, taxa de serviço e total.
export function OrderSummary({ order, children }: OrderSummaryProps) {
  const subtotal = order.unitPriceInCents * order.quantity
  return (
    <Card className="flex flex-col gap-4 p-5 sm:p-6 lg:sticky lg:top-6" aria-labelledby="order-summary-title" role="region">
      <h2 id="order-summary-title" className="text-base font-semibold text-navy">
        Resumo do pedido
      </h2>

      <div className="flex items-center gap-3">
        {order.imageUrl ? (
          <img src={order.imageUrl} alt="" className="size-14 shrink-0 rounded-lg bg-primary-soft object-cover" />
        ) : (
          <div aria-hidden="true" className="size-14 shrink-0 rounded-lg bg-primary-soft" />
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="break-words text-sm font-semibold text-text">{order.title}</p>
          <p className="break-words text-xs text-text-muted">Vendido por {order.seller.name}</p>
        </div>
      </div>

      <dl className="flex flex-col gap-2.5 border-t border-border pt-4">
        <Row label={order.quantity > 1 ? `Produto (${order.quantity} un.)` : 'Produto'} value={formatCurrency(subtotal)} />
        <Row label="Taxa de serviço" value={formatCurrency(order.feeInCents)} />
        <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-border pt-4">
          <dt className="text-sm font-semibold text-navy">Total</dt>
          <dd className="font-display text-[22px] font-bold text-navy">{formatCurrency(order.totalInCents)}</dd>
        </div>
      </dl>

      {children}

      <p className="text-xs text-text-muted">
        Retirada combinada com o(a) vendedor(a) após a confirmação.
      </p>
    </Card>
  )
}

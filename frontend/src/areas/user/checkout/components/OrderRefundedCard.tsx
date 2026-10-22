import { ErrorAlert } from '../../../../shared/components/ui/Alert'
import { ButtonLink } from '../../../../shared/components/ui/Button'
import { ROUTES } from '../../../../shared/constants/routes'
import { formatCurrency } from '../../../../shared/utils/format-currency'
import type { Order } from '../../orders/types/order.types'
import { formatOrderNumber } from '../../orders/utils/order-params'
import { OrderDetailsList } from './OrderDetailsList'

const REASONS: Record<'out_of_stock' | 'listing_unavailable', string> = {
  out_of_stock: 'O item acabou antes de o seu pagamento ser confirmado.', // RN-PAG-08
  listing_unavailable: 'O anúncio deixou de estar disponível antes de o seu pagamento ser confirmado.', // RN-PAG-14
}

// RN-PAG-08, 13 e 14 · RN-NOT-03: pagamento aprovado, mas o pedido foi cancelado e o valor será
// estornado. O Figma não desenha esta tela; ela segue o padrão dos alertas do projeto.
export function OrderRefundedCard({ order }: { order: Order }) {
  const reason = order.cancelReason === 'listing_unavailable' ? REASONS.listing_unavailable : REASONS.out_of_stock
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-center font-display text-[28px] font-bold text-navy">Pedido cancelado</h1>
      <ErrorAlert title="Seu valor será estornado">
        {`${reason} O pedido foi cancelado e o valor será estornado automaticamente. Você também receberá um e-mail com os detalhes.`}
      </ErrorAlert>

      <OrderDetailsList
        rows={[
          { label: 'Pedido', value: formatOrderNumber(order) },
          { label: 'Item', value: order.title },
          { label: 'Valor a estornar', value: formatCurrency(order.totalInCents) },
        ]}
      />

      <ButtonLink to={ROUTES.categories} fullWidth>
        Continuar comprando
      </ButtonLink>
    </div>
  )
}

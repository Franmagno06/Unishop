import { ButtonLink } from '../../../../shared/components/ui/Button'
import { CheckIcon } from '../../../../shared/components/ui/icons'
import { ROUTES } from '../../../../shared/constants/routes'
import { formatCurrency } from '../../../../shared/utils/format-currency'
import type { Order } from '../../orders/types/order.types'
import { formatOrderNumber, whatsappLink } from '../../orders/utils/order-params'
import { OrderDetailsList } from './OrderDetailsList'

// RF011 · RN-PED-03 e RN-PAG-11 (Figma 10). Só é montado com o pedido Pago no backend.
export function OrderPaidCard({ order }: { order: Order }) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <span aria-hidden="true" className="inline-flex size-16 items-center justify-center rounded-full bg-whatsapp text-surface transition-[scale,opacity] duration-300 ease-out-strong starting:scale-90 starting:opacity-0 motion-reduce:transition-opacity">
        <CheckIcon className="size-8" strokeWidth={3} />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[28px] font-bold text-navy">Pagamento confirmado!</h1>
        <p className="text-[13px] text-text-muted">
          O(A) vendedor(a) {order.seller.name} já foi avisado(a). Combine a retirada do seu item no campus.
        </p>
      </div>

      <div className="w-full text-left">
        <OrderDetailsList
          rows={[
            { label: 'Pedido', value: formatOrderNumber(order) },
            { label: 'Item', value: order.title },
            { label: 'Total pago', value: formatCurrency(order.totalInCents) },
            {
              label: 'Contato',
              value: (
                <a
                  href={whatsappLink(order.seller.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Contato do vendedor
                  <span className="sr-only"> (abre o WhatsApp em outra aba)</span>
                </a>
              ),
            },
          ]}
        />
      </div>

      <div className="flex w-full flex-col gap-3">
        <ButtonLink to={ROUTES.myOrders} fullWidth>
          Meus pedidos
        </ButtonLink>
        <ButtonLink to={ROUTES.categories} variant="secondary" fullWidth>
          Continuar comprando
        </ButtonLink>
      </div>
    </div>
  )
}

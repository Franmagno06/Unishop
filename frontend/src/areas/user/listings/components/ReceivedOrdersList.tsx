import { ErrorAlert } from '../../../../shared/components/ui/Alert'
import { Avatar } from '../../../../shared/components/ui/Avatar'
import { Button } from '../../../../shared/components/ui/Button'
import { buttonClasses } from '../../../../shared/components/ui/button-styles'
import { Card } from '../../../../shared/components/ui/Card'
import { ApiError } from '../../../../shared/lib/api'
import { formatDate } from '../../../../shared/utils/format-date'
import { whatsappLink } from '../../../../shared/utils/whatsapp'
import { OrderStatusBadge } from '../../orders/components/OrderStatusBadge'
import type { ReceivedOrder } from '../types/my-listing.types'

function orderSubtitle(order: ReceivedOrder): string {
  const date = formatDate(order.createdAt)
  return order.negotiation === 'site_payment'
    ? `Pagou pelo site${order.paymentMethod ? ` · ${order.paymentMethod}` : ''} · ${date}`
    : `Chamou no WhatsApp · ${date}`
}

type ReceivedOrdersListProps = {
  orders: ReceivedOrder[]
  // Há uma ação em andamento: trava os botões para não disparar duas ao mesmo tempo.
  busy: boolean
  onArrangePickup: (orderId: number) => void
  onCompleteSale: (orderId: number) => void
  onCloseNegotiation: (orderId: number) => void
  error?: unknown
}

// Pedidos recebidos (Figma 05d) · RN-PED-07, 08, 12 e 13. Pago: "Combinar retirada". Em negociação:
// "Concluir venda" e "Encerrar negociação". O WhatsApp do comprador só aparece em tela logada.
export function ReceivedOrdersList({
  orders,
  busy,
  onArrangePickup,
  onCompleteSale,
  onCloseNegotiation,
  error,
}: ReceivedOrdersListProps) {
  return (
    <Card className="flex flex-col gap-3 p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-navy">Pedidos recebidos</h2>

      {error ? (
        <ErrorAlert title="Não foi possível atualizar o pedido">
          {error instanceof ApiError && error.status === 409
            ? error.message
            : 'Confira sua conexão e tente de novo.'}
        </ErrorAlert>
      ) : null}

      {orders.length === 0 ? (
        <p className="rounded-xl bg-background p-4 text-sm text-text-muted">
          Nenhum pedido recebido ainda. Quando alguém pedir este item, ele aparece aqui.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex flex-wrap items-center gap-x-3.5 gap-y-3 rounded-xl bg-background p-3.5"
            >
              <Avatar name={order.buyerName} />
              <div className="flex min-w-0 flex-1 basis-40 flex-col gap-0.5">
                <p className="break-words text-[15px] font-semibold text-text">{order.buyerName}</p>
                <p className="text-[13px] text-text-muted">{orderSubtitle(order)}</p>
              </div>
              <OrderStatusBadge status={order.status} perspective="seller" />
              <div className="flex flex-wrap gap-2">
                {order.status === 'paid' ? (
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => onArrangePickup(order.id)}>
                    Combinar retirada
                  </Button>
                ) : null}
                {order.status === 'negotiating' ? (
                  <>
                    <Button size="sm" disabled={busy} onClick={() => onCompleteSale(order.id)}>
                      Concluir venda
                    </Button>
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => onCloseNegotiation(order.id)}>
                      Encerrar negociação
                    </Button>
                  </>
                ) : null}
                {order.status !== 'cancelled' ? (
                  <a
                    href={whatsappLink(order.buyerWhatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Falar no WhatsApp com ${order.buyerName} (abre em outra aba)`}
                    className={buttonClasses('whatsapp', false, 'sm')}
                  >
                    WhatsApp
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

import { Link } from 'react-router'
import { Button } from '../../../../shared/components/ui/Button'
import { buttonClasses } from '../../../../shared/components/ui/button-styles'
import { cardClasses } from '../../../../shared/components/ui/card-styles'
import { orderPaths } from '../../../../shared/constants/routes'
import { formatCurrency } from '../../../../shared/utils/format-currency'
import { formatDate } from '../../../../shared/utils/format-date'
import { formatWhatsapp, whatsappLink } from '../../../../shared/utils/whatsapp'
import type { BuyerOrder } from '../types/order.types'
import { OrderStatusBadge } from './OrderStatusBadge'

// A data muda de texto conforme o estado, como no Figma: "Pedido #... · data", "Reservado em"
// (retirada combinada) e "Recebido em" (concluído).
function dateLine(order: BuyerOrder): string {
  const date = formatDate(order.createdAt)
  if (order.status === 'pickup_arranged') return `Reservado em ${date}`
  if (order.status === 'completed') return `Recebido em ${date}`
  return `Pedido #${order.code} · ${date}`
}

type OrderCardProps = {
  order: BuyerOrder
  onCancel: (order: BuyerOrder) => void
  onConfirmReceipt: (order: BuyerOrder) => void
}

// Pedido do comprador (Figma 05c) · RN-PED-06. Ações: "Cancelar pedido" só em Pendente e Em
// negociação (RN-PED-12) e "Confirmar recebimento" só em Retirada combinada (RN-PED-08).
// O WhatsApp só aparece aqui porque a tela é logada (RN-PER-04).
export function OrderCard({ order, onCancel, onConfirmReceipt }: OrderCardProps) {
  const canCancel = order.status === 'pending' || order.status === 'negotiating'
  const canConfirm = order.status === 'pickup_arranged'

  return (
    <article
      aria-label={order.listingTitle}
      className={`${cardClasses} relative flex flex-col gap-5 p-5 transition-shadow hover:shadow-md lg:flex-row lg:gap-6 lg:p-6`}
    >
      <div className="flex min-w-0 flex-1 gap-4 sm:gap-6">
        {order.imageUrl ? (
          <img
            src={order.imageUrl}
            alt=""
            loading="lazy"
            className="size-24 shrink-0 rounded-xl object-cover sm:size-[140px]"
          />
        ) : (
          <div aria-hidden="true" className="size-24 shrink-0 rounded-xl bg-primary-soft sm:size-[140px]" />
        )}
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          <OrderStatusBadge status={order.status} perspective="buyer" />
          <h2 className="break-words text-lg font-semibold text-navy">
            {/* Link esticado (after:inset-0): o box inteiro abre os detalhes; botões e WhatsApp ficam acima (z-10). */}
            <Link
              to={orderPaths.detail(order.id)}
              className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary"
            >
              {order.listingTitle}
            </Link>
          </h2>
          <p className="line-clamp-3 break-words text-sm text-text-muted">{order.listingDescription}</p>
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-xl font-bold text-navy">
              {formatCurrency(order.priceInCents)}
            </span>
            <span className="text-[13px] text-text-muted">{dateLine(order)}</span>
          </p>
          {canCancel || canConfirm ? (
            <div className="relative z-10 pt-1">
              {canCancel ? (
                <Button variant="secondary" onClick={() => onCancel(order)}>
                  Cancelar pedido
                </Button>
              ) : (
                <Button onClick={() => onConfirmReceipt(order)}>Confirmar recebimento</Button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative z-10 flex shrink-0 flex-col gap-2 rounded-xl bg-background p-[18px] lg:w-80">
        <p className="text-[11px] font-semibold uppercase text-text-muted">Vendedor</p>
        <p className="break-words text-base font-semibold text-text">{order.seller.name}</p>
        <p className="text-[13px] text-text-muted">
          {order.negotiation === 'site_payment' ? 'Pago pelo site' : 'Negociado pelo WhatsApp'}
        </p>
        <p className="text-sm font-semibold text-navy">
          WhatsApp: {formatWhatsapp(order.seller.whatsapp)}
        </p>
        <a
          href={whatsappLink(order.seller.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Falar no WhatsApp com ${order.seller.name} (abre em outra aba)`}
          className={buttonClasses('whatsapp', true)}
        >
          Falar no WhatsApp
        </a>
      </div>
    </article>
  )
}

import { Button } from '../../../../shared/components/ui/Button'
import { CreditCardIcon } from '../../../../shared/components/ui/icons'
import { formatCurrency } from '../../../../shared/utils/format-currency'

const cardClasses = 'flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5 sm:p-6'
const chipClasses = 'rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-navy'

type OrderPanelProps = {
  priceInCents: number
  quantity: number
  onOrder: () => void
}

// Cartão "Realize o pedido" (Figma 08a, RF009). Quem pode pedir vê o botão; dono do anúncio e
// administrador veem os avisos abaixo (RN-ANU-10 e admin não compra), cada um um componente próprio.
export function OrderPanel({ priceInCents, quantity, onOrder }: OrderPanelProps) {
  return (
    <section aria-labelledby="order-title" className={cardClasses}>
      <h2 id="order-title" className="flex items-center gap-2.5 text-[17px] font-semibold text-navy">
        <CreditCardIcon className="size-5 text-primary" />
        Realize o pedido
      </h2>
      <p className="text-sm text-text-muted">
        Pague com cartão ou Pix com segurança. Ou entre em contato com o vendedor.
      </p>
      <ul className="flex flex-wrap gap-2" aria-label="Formas de pedido">
        <li className={chipClasses}>Cartão de crédito</li>
        <li className={chipClasses}>Pix</li>
        <li className={chipClasses}>Contato</li>
      </ul>
      {quantity > 1 ? <p className="text-sm text-text-muted">{quantity} unidades disponíveis</p> : null}
      <Button fullWidth onClick={onOrder}>
        Fazer pedido — {formatCurrency(priceInCents)}
      </Button>
    </section>
  )
}

export function OwnListingNotice() {
  return (
    <section aria-labelledby="own-title" className={cardClasses}>
      <h2 id="own-title" className="text-[17px] font-semibold text-navy">
        Este é o seu anúncio
      </h2>
      <p className="text-sm text-text-muted">Você não pode fazer pedido do próprio anúncio.</p>
    </section>
  )
}

export function AdminOrderNotice() {
  return (
    <section aria-labelledby="admin-title" className={cardClasses}>
      <h2 id="admin-title" className="text-[17px] font-semibold text-navy">
        Pedidos indisponíveis para administradores
      </h2>
      <p className="text-sm text-text-muted">A conta de administrador só modera o Unishop: não compra nem paga.</p>
    </section>
  )
}

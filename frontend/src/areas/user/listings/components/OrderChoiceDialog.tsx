import { useState, type ReactNode } from 'react'
import { ErrorAlert, InfoAlert } from '../../../../shared/components/ui/Alert'
import { ChatIcon, CloseIcon } from '../../../../shared/components/ui/icons'
import { Modal } from '../../../../shared/components/ui/Modal'
import { formatCurrency } from '../../../../shared/utils/format-currency'
import type { ListingDetail } from '../types/listing.types'

type OrderChoiceDialogProps = {
  open: boolean
  listing: ListingDetail
  onClose: () => void
  // "Seguir para o pagamento": quem monta a tela cria o pedido e navega (RN-PED-04, RF009.3).
  onSelectPayment: () => void
  paymentStatus: 'idle' | 'pending' | 'error'
  paymentError: string | null
}

type OptionTone = 'payment' | 'contact'

const optionStyles: Record<OptionTone, { border: string; circle: string; arrow: string }> = {
  payment: { border: 'border-primary', circle: 'bg-primary', arrow: 'text-primary' },
  contact: { border: 'border-whatsapp', circle: 'bg-whatsapp', arrow: 'text-whatsapp' },
}

function OptionButton({
  tone,
  icon,
  title,
  children,
  onClick,
  disabled,
}: {
  tone: OptionTone
  icon: ReactNode
  title: string
  children: string
  onClick: () => void
  disabled?: boolean
}) {
  const styles = optionStyles[tone]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-4 rounded-[14px] border-[1.5px] bg-surface p-4 text-left transition-transform duration-150 ease-out-strong active:scale-[0.99] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-[18px] ${styles.border}`}
    >
      <span
        aria-hidden="true"
        className={`inline-flex size-12 shrink-0 items-center justify-center rounded-full text-xl font-bold text-surface ${styles.circle}`}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-base font-semibold text-navy">{title}</span>
        <span className="text-[13px] text-text-muted">{children}</span>
      </span>
      <span aria-hidden="true" className={`text-[28px] font-semibold leading-none ${styles.arrow}`}>
        ›
      </span>
    </button>
  )
}

// Conteúdo à parte do Modal: ao fechar ele sai da tela e o aviso volta a ficar escondido.
function OrderChoiceContent({
  listing,
  onClose,
  onSelectPayment,
  paymentStatus,
  paymentError,
}: Omit<OrderChoiceDialogProps, 'open'>) {
  // O contato com o vendedor (WhatsApp) ainda não leva a lugar nenhum: o clique só avisa.
  const [soon, setSoon] = useState(false)
  const paying = paymentStatus === 'pending'
  const cover = listing.images[0]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <h2 id="order-choice-title" className="font-display text-[26px] font-bold leading-tight text-navy">
          Como você quer fazer o pedido?
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="rounded p-1 text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <CloseIcon className="size-5" />
        </button>
      </div>

      <div className="flex items-center gap-3.5 rounded-xl bg-background p-3">
        {cover ? (
          <img src={cover} alt="" className="size-14 shrink-0 rounded-lg bg-primary-soft object-cover" />
        ) : (
          <div aria-hidden="true" className="size-14 shrink-0 rounded-lg bg-primary-soft" />
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-[15px] font-semibold text-text">{listing.title}</p>
          <p className="truncate text-[13px] text-text-muted">
            {formatCurrency(listing.priceInCents)} · vendido por {listing.seller.name}
          </p>
        </div>
      </div>

      <OptionButton
        tone="payment"
        icon="R$"
        title="Seguir para o pagamento"
        disabled={paying}
        onClick={() => {
          setSoon(false)
          onSelectPayment()
        }}
      >
        {paying ? 'Criando o seu pedido…' : 'Pague agora com cartão de crédito ou Pix pelo Unishop, com segurança.'}
      </OptionButton>
      <OptionButton
        tone="contact"
        icon={<ChatIcon className="size-6" />}
        title="Entrar em contato com o vendedor"
        onClick={() => setSoon(true)}
      >
        {`Converse com ${listing.seller.name} no WhatsApp para tirar dúvidas ou negociar.`}
      </OptionButton>

      {paymentStatus === 'error' && paymentError ? <ErrorAlert>{paymentError}</ErrorAlert> : null}
      {soon ? (
        <div role="status">
          <InfoAlert>Esta etapa ainda não está disponível na demonstração. Ela será ligada nas próximas telas.</InfoAlert>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onClose}
        className="self-start rounded text-sm font-semibold text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Cancelar
      </button>
    </div>
  )
}

// Pop-up "Como você quer fazer o pedido?" (Figma 08d, RN-PED-04, RF009.3 e RF009.4).
export function OrderChoiceDialog({ open, onClose, ...content }: OrderChoiceDialogProps) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="order-choice-title">
      <OrderChoiceContent onClose={onClose} {...content} />
    </Modal>
  )
}

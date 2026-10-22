import { ChatIcon, CreditCardIcon, MapPinIcon } from '../../../../shared/components/ui/icons'
import type { ListingSummary } from '../types/listing.types'
import { CONTACT_LABELS } from '../utils/listing-params'

const icons = { site: CreditCardIcon, campus: MapPinIcon, whatsapp: ChatIcon }

// Linha de contato do card: ícone + texto ("Pagamento no site", "Bloco K · Horário EF", "WhatsApp").
// Ícones simples no lugar dos emojis do Figma (o desenho do emoji muda de aparelho para aparelho).
export function ContactLine({ contact }: { contact: ListingSummary['contact'] }) {
  const Icon = icons[contact.mode]
  const text = contact.mode === 'campus' && contact.place ? contact.place : CONTACT_LABELS[contact.mode]

  return (
    <p className="flex items-center gap-1.5 text-[13px] text-text-muted">
      <Icon className="size-3.5" />
      {text}
    </p>
  )
}

import { Badge, type BadgeTone } from '../../../../shared/components/ui/Badge'
import type { ListingStatus } from '../types/my-listing.types'

const content: Record<ListingStatus, { label: string; tone: BadgeTone; dot: boolean }> = {
  active: { label: 'Ativo', tone: 'success', dot: true },
  paused: { label: 'Pausado', tone: 'neutral', dot: true },
  sold: { label: 'Vendido', tone: 'info', dot: false },
}

// Selo do estado do anúncio: ATIVO é o verde do Figma (05d); Pausado e Vendido não são desenhados
// e seguem o mesmo molde.
export function ListingStatusBadge({ status }: { status: ListingStatus }) {
  const { label, tone, dot } = content[status]
  return (
    <Badge tone={tone} dot={dot}>
      {label}
    </Badge>
  )
}

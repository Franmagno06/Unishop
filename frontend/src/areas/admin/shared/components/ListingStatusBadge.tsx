import { Badge, type BadgeTone } from '../../../../shared/components/ui/Badge'
import type { ListingStatus } from '../types'

const content: Record<ListingStatus, { label: string; tone: BadgeTone }> = {
  active: { label: 'Ativo', tone: 'info' },
  paused: { label: 'Pausado', tone: 'neutral' },
  sold: { label: 'Vendido', tone: 'neutral' },
}

// Selo do estado do produto no painel (Figma A02 a A04): ATIVO em azul-claro, os outros em cinza.
export function ListingStatusBadge({ status }: { status: ListingStatus }) {
  const { label, tone } = content[status]
  return <Badge tone={tone}>{label}</Badge>
}

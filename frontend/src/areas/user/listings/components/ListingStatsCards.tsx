import { Card } from '../../../../shared/components/ui/Card'

type Stat = { value: number; label: string }

// Indicadores do anúncio (Figma 05d) · RN-ANU-08: visualizações, contatos pelo WhatsApp e pedidos
// recebidos. A contagem é do backend.
export function ListingStatsCards({ stats }: { stats: Stat[] }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="flex flex-col-reverse gap-1 rounded-[14px] px-5 py-[18px]">
          <dt className="text-[13px] text-text-muted">{stat.label}</dt>
          <dd className="font-display text-[30px] font-bold leading-tight text-navy">
            {stat.value.toLocaleString('pt-BR')}
          </dd>
        </Card>
      ))}
    </dl>
  )
}

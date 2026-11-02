import { Button } from '../../../../shared/components/ui/Button'
import { Skeleton } from '../../../../shared/components/ui/Skeleton'
import { useRecentListings } from '../hooks/use-recent-listings'
import { RecentListingsCarousel } from './RecentListingsCarousel'

function Heading() {
  return (
    <h2 id="recentes-titulo" className="font-display text-2xl font-bold text-navy">
      Anúncios recentes
    </h2>
  )
}

// Seção "Anúncios recentes" da tela inicial (RF001.4, visível ao visitante). A falha da API nunca
// derruba a página: o título fica e o aviso traz "Tentar de novo".
export function RecentListings() {
  const recent = useRecentListings()

  if (recent.isPending) {
    return (
      <section aria-labelledby="recentes-titulo" className="flex w-full flex-col gap-4">
        <Heading />
        {/* overflow-hidden: dois esqueletos de 240 px passam da largura de um celular de 390 px. */}
        <div role="status" aria-label="Carregando anúncios recentes" className="flex gap-4 overflow-hidden">
          <Skeleton className="h-72 w-60 shrink-0" />
          <Skeleton className="h-72 w-60 shrink-0" />
        </div>
      </section>
    )
  }

  if (recent.isError) {
    return (
      <section aria-labelledby="recentes-titulo" className="flex w-full flex-col items-start gap-4">
        <Heading />
        <p className="text-text-muted">Não foi possível carregar os anúncios.</p>
        <Button variant="secondary" onClick={() => void recent.refetch()}>
          Tentar de novo
        </Button>
      </section>
    )
  }

  if (recent.data.length === 0) {
    return (
      <section aria-labelledby="recentes-titulo" className="flex w-full flex-col gap-4">
        <Heading />
        <p className="text-text-muted">Ainda não há anúncios.</p>
      </section>
    )
  }

  return <RecentListingsCarousel listings={recent.data} />
}

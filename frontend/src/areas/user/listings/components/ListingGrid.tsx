import { Card } from '../../../../shared/components/ui/Card'
import { Skeleton } from '../../../../shared/components/ui/Skeleton'
import type { ListingSummary } from '../types/listing.types'
import { ListingCard } from './ListingCard'

function ListingSkeleton() {
  return (
    <Card className="flex flex-1 flex-col gap-2.5 rounded-[14px] px-4 pb-5 pt-4">
      <Skeleton className="h-45 rounded-[10px]" />
      <Skeleton className="h-5 w-4/5" />
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-1/2" />
    </Card>
  )
}

// Grade do Figma (4 colunas, espaçamento de 24 px). Abaixo disso: 3, 2 e 1 coluna.
// `skeletonCount` acrescenta cards "carregando" no fim (primeira carga ou próxima página).
export function ListingGrid({
  listings,
  skeletonCount = 0,
}: {
  listings: ListingSummary[]
  skeletonCount?: number
}) {
  return (
    <ul className="grid grid-cols-1 gap-6 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {listings.map((listing) => (
        <li key={listing.id} className="flex">
          <ListingCard listing={listing} />
        </li>
      ))}
      {Array.from({ length: skeletonCount }, (_, index) => (
        <li key={`carregando-${index}`} className="flex" aria-hidden="true">
          <ListingSkeleton />
        </li>
      ))}
    </ul>
  )
}

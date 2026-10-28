import { Avatar } from '../../../../shared/components/ui/Avatar'
import { Button } from '../../../../shared/components/ui/Button'
import { Card } from '../../../../shared/components/ui/Card'
import { Skeleton } from '../../../../shared/components/ui/Skeleton'
import { formatDate } from '../../../../shared/utils/format-date'
import { StarRating } from '../../../user/listings/components/StarRating'
import { useReviews } from '../../../user/listings/hooks/use-reviews'
import { averageRating, formatRating } from '../../../user/listings/utils/rating'

// Avaliações do produto para o admin, das PIORES para as melhores (empate: a mais recente primeiro),
// para achar problemas em potencial e motivos para excluir anúncios mal avaliados.
export function ProductReviews({ productId }: { productId: number }) {
  const reviews = useReviews(productId)
  const items = [...(reviews.data ?? [])].sort(
    (a, b) => a.rating - b.rating || b.createdAt.localeCompare(a.createdAt),
  )
  const average = averageRating(items.map((review) => review.rating))

  return (
    <Card className="flex flex-col gap-3 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-navy">Avaliações (piores primeiro)</h2>
        {items.length > 0 ? (
          <p className="flex items-center gap-2 text-sm text-text-muted">
            <StarRating rating={average} />
            <span>
              {formatRating(average)} · {items.length} {items.length === 1 ? 'avaliação' : 'avaliações'}
            </span>
          </p>
        ) : null}
      </div>

      {reviews.isPending ? (
        <>
          <p role="status" className="sr-only">
            Carregando avaliações…
          </p>
          <Skeleton className="h-20 rounded-xl" />
        </>
      ) : reviews.isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-background p-4 text-sm text-text-muted">
          Não foi possível carregar as avaliações.
          <Button size="sm" variant="secondary" onClick={() => void reviews.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl bg-background p-4 text-sm text-text-muted">Este produto ainda não tem avaliações.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((review) => (
            <li key={review.id} className="flex gap-3.5 rounded-xl bg-background p-3.5">
              <Avatar name={review.authorName} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="break-words text-[15px] font-semibold text-text">{review.authorName}</p>
                  <StarRating rating={review.rating} />
                  <span className="text-[13px] text-text-muted">{formatDate(review.createdAt)}</span>
                </div>
                {review.comment ? (
                  <p className="whitespace-pre-line break-words text-sm text-text-muted">{review.comment}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

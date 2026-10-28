import { useState } from 'react'
import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog'
import { TextAreaField } from '../../../../shared/components/ui/TextAreaField'
import { StarRatingInput } from '../../listings/components/StarRating'
import type { NewReview } from '../../listings/types/review.types'
import type { BuyerOrder } from '../types/order.types'

const COMMENT_MAX = 500

type ReviewOrderDialogProps = {
  order: BuyerOrder
  onConfirm: (review: NewReview) => void
  onCancel: () => void
  pending: boolean
  failed: boolean
}

// Avaliação do item de um pedido Concluído (provisório: avaliações não estão nas Regras). A nota é
// obrigatória; o comentário é opcional.
export function ReviewOrderDialog({ order, onConfirm, onCancel, pending, failed }: ReviewOrderDialogProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')

  return (
    <ConfirmDialog
      tone="primary"
      title="Avaliar este produto"
      description={`Conte como foi a compra de "${order.listingTitle}". Sua avaliação aparece na página do produto.`}
      confirmLabel="Enviar avaliação"
      cancelLabel="Voltar"
      onConfirm={() => onConfirm({ rating, comment })}
      onCancel={onCancel}
      pending={pending}
      confirmDisabled={rating === 0}
      errorMessage={failed ? 'Não foi possível enviar a avaliação. Tente de novo.' : undefined}
    >
      <StarRatingInput value={rating} onChange={setRating} disabled={pending} />
      <TextAreaField
        label="Comentário (opcional)"
        value={comment}
        maxLength={COMMENT_MAX}
        onChange={(event) => setComment(event.target.value)}
        disabled={pending}
      />
    </ConfirmDialog>
  )
}

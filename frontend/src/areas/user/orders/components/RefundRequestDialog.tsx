import { useState } from 'react'
import { TextAreaField } from '../../../../shared/components/ui/TextAreaField'
import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog'
import type { BuyerOrder } from '../types/order.types'

type RefundRequestDialogProps = {
  order: BuyerOrder
  onConfirm: (description: string) => void
  onCancel: () => void
  pending: boolean
  failed: boolean
}

// Pedido de reembolso de pedido Concluído (provisório: fora das Regras). A descrição é obrigatória
// e libera o botão. As fotos são opcionais e, POR ENQUANTO, só escolhidas na tela: não são enviadas
// nem guardadas (ver docs/frontend/roteiro-telas.md, "Reembolso: provisório").
export function RefundRequestDialog({ order, onConfirm, onCancel, pending, failed }: RefundRequestDialogProps) {
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<File[]>([])

  return (
    <ConfirmDialog
      title="Pedir reembolso"
      description={`Conte o que houve com "${order.listingTitle}". O suporte avalia o pedido antes de responder.`}
      confirmLabel="Confirmar reembolso"
      cancelLabel="Voltar"
      onConfirm={() => onConfirm(description.trim())}
      onCancel={onCancel}
      pending={pending}
      confirmDisabled={description.trim() === ''}
      errorMessage={failed ? 'Não foi possível enviar agora. Tente de novo.' : undefined}
    >
      <TextAreaField
        label="Descreva o problema"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        maxLength={1000}
        required
      />
      <div className="flex flex-col gap-2">
        <label htmlFor="refund-photos" className="text-sm font-semibold text-text">
          Fotos do problema (opcional)
        </label>
        <input
          id="refund-photos"
          type="file"
          accept="image/jpeg,image/png"
          multiple
          onChange={(event) => setPhotos(Array.from(event.target.files ?? []))}
          className="text-sm text-text-muted"
        />
        {photos.length > 0 ? (
          <ul className="text-xs text-text-muted">
            {photos.map((photo) => (
              <li key={`${photo.name}-${photo.size}`}>{photo.name}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </ConfirmDialog>
  )
}

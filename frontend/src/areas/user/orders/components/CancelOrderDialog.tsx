import { useState } from 'react'
import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog'
import type { BuyerCancelReason, BuyerOrder } from '../types/order.types'
import { cancelReasonLabels, paidCancelReasons, unpaidCancelReasons } from '../utils/order-status'

type CancelOrderDialogProps = {
  order: BuyerOrder
  // Pedido já pago: outro texto e outra lista de motivos, e o reembolso é avisado depois.
  paid?: boolean
  onConfirm: (reason: BuyerCancelReason) => void
  onCancel: () => void
  pending: boolean
  failed: boolean
}

// Pop-up de cancelamento do pedido (RN-PED-12). "Cancelar pedido" só habilita depois de marcar o
// motivo; o motivo não vem marcado, para a escolha ser sempre consciente.
export function CancelOrderDialog({ order, paid = false, onConfirm, onCancel, pending, failed }: CancelOrderDialogProps) {
  const [reason, setReason] = useState<BuyerCancelReason | null>(null)
  const reasons = paid ? paidCancelReasons : unpaidCancelReasons

  return (
    <ConfirmDialog
      title={paid ? 'Confirmar o cancelamento?' : 'Cancelar este pedido?'}
      description={
        paid
          ? `O pedido de "${order.listingTitle}" já foi pago. Ao cancelar, o valor é reembolsado e o vendedor é avisado.`
          : `O pedido de "${order.listingTitle}" será cancelado e o vendedor deixa de esperar por você.`
      }
      confirmLabel="Cancelar pedido"
      cancelLabel="Voltar"
      onConfirm={() => reason && onConfirm(reason)}
      onCancel={onCancel}
      pending={pending}
      confirmDisabled={reason === null}
      errorMessage={failed ? 'Não foi possível cancelar agora. Atualize a página e tente de novo.' : undefined}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-navy">Qual o motivo do cancelamento?</legend>
        {reasons.map((value) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm text-text has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
          >
            <input
              type="radio"
              name="cancel-reason"
              value={value}
              checked={reason === value}
              onChange={() => setReason(value)}
              className="size-4 accent-primary"
            />
            {cancelReasonLabels[value]}
          </label>
        ))}
      </fieldset>
    </ConfirmDialog>
  )
}

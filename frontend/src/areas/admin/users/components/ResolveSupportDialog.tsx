import { useId } from 'react'
import { ErrorAlert } from '../../../../shared/components/ui/Alert'
import { Button } from '../../../../shared/components/ui/Button'
import { Modal } from '../../../../shared/components/ui/Modal'
import type { SupportRequest, SupportRequestStatus, SupportRequestType } from '../types/support.types'

const TYPE_LABEL: Record<SupportRequestType, string> = {
  refund: 'Reembolso',
  order_cancellation: 'Cancelamento de pedido',
  other: 'Outro assunto',
}

type ResolveSupportDialogProps = {
  request: SupportRequest
  // "Validar" resolve a solicitação; "Negar" a recusa.
  onDecide: (status: Extract<SupportRequestStatus, 'resolved' | 'denied'>) => void
  onClose: () => void
  pending: boolean
  failed: boolean
}

// Pop-up de "Resolver" no suporte ao usuário: mostra o que o aluno relatou (motivo marcado no
// cancelamento, descrição do problema e fotos anexadas) para o admin validar ou negar. Voltar fica
// no canto superior esquerdo.
export function ResolveSupportDialog({ request, onDecide, onClose, pending, failed }: ResolveSupportDialogProps) {
  const titleId = useId()

  return (
    <Modal labelledBy={titleId} onClose={onClose} busy={pending}>
      <button
        type="button"
        onClick={onClose}
        disabled={pending}
        className="group inline-flex items-center gap-1.5 self-start rounded text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
      >
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4 shrink-0 transition-transform duration-150 ease-out-strong group-hover:-translate-x-0.5 motion-reduce:transition-none"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Voltar
      </button>

      <div className="flex flex-col gap-1">
        <h2 id={titleId} className="font-display text-[26px] font-bold leading-tight text-navy">
          Resolver solicitação
        </h2>
        <p className="break-words text-[15px] text-text-muted">
          {TYPE_LABEL[request.type]} de {request.userName}
          {request.orderId ? ` · Pedido #${request.orderId}` : ''}.
        </p>
      </div>

      <div className="flex max-h-[50vh] flex-col gap-4 overflow-y-auto">
        {request.reason ? (
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-navy">Motivo marcado</h3>
            <p className="text-sm text-text">{request.reason}</p>
          </div>
        ) : null}
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-navy">Descrição do problema</h3>
          <p className="whitespace-pre-wrap break-words rounded-xl bg-background p-3 text-sm text-text">
            {request.message}
          </p>
        </div>
        {request.photos.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-navy">Fotos anexadas</h3>
            <ul className="grid grid-cols-2 gap-2">
              {request.photos.map((photo, index) => (
                <li key={photo}>
                  <a href={photo} target="_blank" rel="noopener noreferrer" className="block">
                    <img
                      src={photo}
                      alt={`Foto ${index + 1} enviada por ${request.userName}`}
                      className="aspect-[4/3] w-full rounded-xl border border-border object-cover"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : request.type === 'refund' ? (
          <p className="text-sm text-text-muted">Nenhuma foto anexada.</p>
        ) : null}
      </div>

      {failed ? <ErrorAlert>Não foi possível salvar a decisão agora. Tente de novo.</ErrorAlert> : null}
      <div className="flex gap-3">
        <Button variant="danger" className="flex-1" disabled={pending} onClick={() => onDecide('denied')}>
          Negar
        </Button>
        <Button variant="success" className="flex-1" disabled={pending} onClick={() => onDecide('resolved')}>
          Validar
        </Button>
      </div>
    </Modal>
  )
}

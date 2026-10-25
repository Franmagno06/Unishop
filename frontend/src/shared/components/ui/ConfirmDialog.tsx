import { useRef, type ReactNode } from 'react'
import { ErrorAlert } from './Alert'
import { Button } from './Button'
import { Modal } from './Modal'

type ConfirmDialogProps = {
  // 'danger': "!" vermelho e botão de perigo (excluir). 'primary': "✓" azul (confirmar).
  tone?: 'danger' | 'primary'
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  pending?: boolean
  // Mensagem de falha da última tentativa (o pop-up continua aberto).
  errorMessage?: string
  // Impede a confirmação (ex.: "digite EXCLUIR" ainda não bate).
  confirmDisabled?: boolean
  // Conteúdo extra entre o texto e os botões (ex.: o campo de confirmação).
  children?: ReactNode
}

// Pop-up de confirmação das ações irreversíveis: excluir perfil e anúncio, marcar como vendido,
// cancelar pedido, confirmar recebimento. Um lado cancela, o outro confirma (Figma: 12 px de vão).
export function ConfirmDialog({
  tone = 'danger',
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  pending = false,
  errorMessage,
  confirmDisabled = false,
  children,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const isDanger = tone === 'danger'

  return (
    <Modal
      title={title}
      description={description}
      icon={
        <span
          className={`flex size-14 items-center justify-center rounded-full text-[26px] font-bold ${
            isDanger ? 'bg-danger-soft text-danger' : 'bg-primary-soft text-navy'
          }`}
        >
          {isDanger ? '!' : '✓'}
        </span>
      }
      onClose={onCancel}
      busy={pending}
      // Ação destrutiva sem campo de texto abre com o foco em "Cancelar": Enter sem querer não apaga nada.
      initialFocusRef={isDanger && !children ? cancelRef : undefined}
    >
      {children}
      {errorMessage ? <ErrorAlert>{errorMessage}</ErrorAlert> : null}
      <div className="flex gap-3">
        <Button
          ref={cancelRef}
          variant="secondary"
          className="flex-1"
          onClick={onCancel}
          disabled={pending}
        >
          {cancelLabel}
        </Button>
        <Button
          variant={isDanger ? 'danger' : 'primary'}
          className="flex-1"
          onClick={onConfirm}
          disabled={pending || confirmDisabled}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

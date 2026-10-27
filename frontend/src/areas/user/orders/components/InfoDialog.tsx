import { useRef, type ReactNode } from 'react'
import { Button } from '../../../../shared/components/ui/Button'
import { Modal } from '../../../../shared/components/ui/Modal'

type InfoDialogProps = {
  title: string
  description: string
  // Detalhe extra abaixo do texto (ex.: prazo do reembolso).
  children?: ReactNode
  closeLabel?: string
  onClose: () => void
}

// Pop-up só de aviso (um botão): "reembolso será feito", "pedido de reembolso enviado" etc.
export function InfoDialog({ title, description, children, closeLabel = 'Entendi', onClose }: InfoDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  return (
    <Modal
      title={title}
      description={description}
      icon={
        <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-[26px] font-bold text-navy">
          ✓
        </span>
      }
      onClose={onClose}
      initialFocusRef={closeRef}
    >
      {children}
      <Button ref={closeRef} onClick={onClose}>
        {closeLabel}
      </Button>
    </Modal>
  )
}

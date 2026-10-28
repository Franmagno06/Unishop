import { Button } from '../../../../shared/components/ui/Button'
import { CheckIcon } from '../../../../shared/components/ui/icons'
import { Modal } from '../../../../shared/components/ui/Modal'

// Pop-up "Alterações salvas!" (Figma: "Pop-up · Usuário atualizado" e "Produto atualizado").
export function SavedChangesModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="Alterações salvas!"
      description="As informações foram atualizadas e já aparecem para os alunos."
      icon={
        <span className="flex size-14 items-center justify-center rounded-full bg-whatsapp text-surface transition-[scale,opacity] duration-300 ease-out-strong starting:scale-90 starting:opacity-0 motion-reduce:transition-opacity">
          <CheckIcon className="size-7" />
        </span>
      }
      onClose={onClose}
    >
      <Button fullWidth onClick={onClose}>
        Voltar
      </Button>
    </Modal>
  )
}

import { useId, useState } from 'react'
import { ApiError } from '../../../../shared/lib/api'
import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog'
import { inputClasses } from '../../../../shared/components/ui/field-styles'
import { useDeleteAccount } from '../hooks/use-delete-account'

const CONFIRM_WORD = 'EXCLUIR'

function failureMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === 'HAS_OPEN_PAID_ORDERS') {
    return 'Você tem pedidos pagos ou com retirada combinada em aberto. Conclua-os antes de excluir o perfil.'
  }
  return 'Não foi possível excluir o perfil agora. Tente de novo.'
}

// Figma "Pop-up · Confirmar exclusão" · RF013.7 e RN-PER-06: só exclui quem digita "EXCLUIR".
// O texto fala em anonimizar (e não "apagar") porque a exclusão é lógica; pedidos pagos continuam
// no histórico da outra parte (Regras §10, divergência com o texto do Figma).
export function DeleteAccountModal({ onCancel }: { onCancel: () => void }) {
  const [typed, setTyped] = useState('')
  const inputId = useId()
  const remove = useDeleteAccount()

  return (
    <ConfirmDialog
      title="Excluir seu perfil?"
      description="Seus dados pessoais serão anonimizados e seus anúncios saem do ar. Pedidos já pagos continuam no histórico da outra pessoa. Essa ação não pode ser desfeita."
      confirmLabel="Sim, excluir perfil"
      onConfirm={() => remove.mutate()}
      onCancel={onCancel}
      pending={remove.isPending}
      confirmDisabled={typed !== CONFIRM_WORD}
      errorMessage={remove.isError ? failureMessage(remove.error) : undefined}
    >
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-sm font-semibold text-text">
          Digite {CONFIRM_WORD} para confirmar
        </label>
        <input
          id={inputId}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder={CONFIRM_WORD}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className={inputClasses()}
        />
      </div>
    </ConfirmDialog>
  )
}

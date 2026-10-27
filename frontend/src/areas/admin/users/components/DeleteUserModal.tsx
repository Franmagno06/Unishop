import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog'
import { deleteErrorMessage } from '../../shared/utils/delete-error'
import { useDeleteUser } from '../hooks/use-admin-users'

type DeleteUserModalProps = {
  user: { id: number; name: string; listingsCount: number }
  onClose: () => void
  onDeleted: () => void
}

function describe(name: string, listings: number): string {
  const ads =
    listings === 0
      ? ''
      : listings === 1
        ? ' e o anúncio da conta sairá do ar'
        : ` e os ${listings} anúncios da conta sairão do ar`
  return `A conta de ${name} será anonimizada${ads}. A pessoa perderá o acesso ao Unishop; pedidos já pagos continuam no histórico de quem comprou. Essa ação não pode ser desfeita.`
}

// RN-ADM-06 · Figma "Pop-up · Excluir usuário". Excluir anonimiza a conta (exclusão lógica), então
// o texto do Figma ("removidos") foi trocado por "anonimizada" (Regras §10). Ação irreversível:
// o foco abre em "Cancelar".
export function DeleteUserModal({ user, onClose, onDeleted }: DeleteUserModalProps) {
  const remove = useDeleteUser()

  return (
    <ConfirmDialog
      title="Excluir este usuário?"
      description={describe(user.name, user.listingsCount)}
      confirmLabel="Excluir"
      onConfirm={() => remove.mutate(user.id, { onSuccess: onDeleted })}
      onCancel={onClose}
      pending={remove.isPending}
      errorMessage={remove.isError ? deleteErrorMessage(remove.error, 'usuário') : undefined}
    />
  )
}

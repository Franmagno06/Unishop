import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog'
import { deleteErrorMessage } from '../../shared/utils/delete-error'
import { useDeleteProduct } from '../hooks/use-admin-products'

type DeleteProductModalProps = {
  product: { id: number; title: string }
  onClose: () => void
  onDeleted: () => void
}

// RN-ADM-09 · Figma "Pop-up · Excluir produto". O vendedor é avisado por e-mail (RN-NOT-02).
// Ação irreversível: o foco abre em "Cancelar".
export function DeleteProductModal({ product, onClose, onDeleted }: DeleteProductModalProps) {
  const remove = useDeleteProduct()

  return (
    <ConfirmDialog
      title="Excluir este produto?"
      description="O anúncio será removido da plataforma e o vendedor será notificado. Essa ação não pode ser desfeita."
      confirmLabel="Excluir"
      onConfirm={() => remove.mutate(product.id, { onSuccess: onDeleted })}
      onCancel={onClose}
      pending={remove.isPending}
      errorMessage={remove.isError ? deleteErrorMessage(remove.error, 'produto') : undefined}
    />
  )
}

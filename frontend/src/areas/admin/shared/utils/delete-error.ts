import { ApiError } from '../../../../shared/lib/api'

// Mensagem do pop-up de exclusão quando a API recusa (RN-ADM-06 e 09, ADMIN_PROTECTED).
export function deleteErrorMessage(error: unknown, what: 'usuário' | 'produto'): string {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR') return 'Sem conexão com o servidor. Confira a internet e tente de novo.'
    if (error.code === 'HAS_OPEN_PAID_ORDERS') {
      return `Não dá para excluir agora: há pedido pago ou com retirada combinada em aberto. Cancele o pedido (com estorno) e tente de novo.`
    }
    if (error.code === 'ADMIN_PROTECTED') return error.message
    if (error.status === 404) return `Este ${what} não existe mais. Atualize a página.`
  }
  return `Não foi possível excluir o ${what} agora. Tente de novo em instantes.`
}

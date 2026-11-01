import type { Prisma } from '../../generated/prisma/client'

// RN-ANU-09, RN-PER-06, RN-ADM-06, 09. Pedidos "em aberto" = pendente, em_negociacao, pago,
// retirada_combinada. Os dois primeiros são cancelados; os dois últimos bloqueiam a exclusão.
export type OpenOrder = {
  id: number
  status: 'pendente' | 'em_negociacao' | 'pago' | 'retirada_combinada'
}
export type OrderScope = { listingId: number } | { userId: number } // userId: como comprador OU vendedor

/**
 * SELECT ... FOR UPDATE, ordenado por id_pedido. Chamar ANTES de travar o anúncio: a ordem das
 * travas é usuario -> pedido -> anuncio, a mesma da liquidação do pagamento (evita deadlock).
 */
export async function lockOpenOrders(
  tx: Prisma.TransactionClient,
  scope: OrderScope,
): Promise<OpenOrder[]> {
  if ('listingId' in scope) {
    return tx.$queryRaw<OpenOrder[]>`
      SELECT id_pedido AS id, status_pedido AS status
        FROM pedido
       WHERE id_anuncio = ${scope.listingId}
         AND status_pedido IN ('pendente','em_negociacao','pago','retirada_combinada')
       ORDER BY id_pedido
         FOR UPDATE`
  }
  return tx.$queryRaw<OpenOrder[]>`
    SELECT id_pedido AS id, status_pedido AS status
      FROM pedido
     WHERE (id_comprador = ${scope.userId} OR id_vendedor = ${scope.userId})
       AND status_pedido IN ('pendente','em_negociacao','pago','retirada_combinada')
     ORDER BY id_pedido
       FOR UPDATE`
}

/** true se houver pedido pago ou com retirada combinada. */
export const hasOpenPaidOrders = (orders: OpenOrder[]) =>
  orders.some((o) => o.status === 'pago' || o.status === 'retirada_combinada')

/**
 * Cancela os pendente/em_negociacao da lista (UPDATE condicional no status) e devolve os ids cancelados.
 * Ponto de extensão para as Etapas 6 e 7: quem chama recebe os ids e, depois do commit, poderá
 * cancelar a cobrança aberta no gateway (`cancelPayment`, backend.md §9.5). Hoje não há payments.
 * Não grava motivo: a coluna `motivo_cancelamento` (P9) ainda não existe.
 */
export async function cancelUnpaidOrders(
  tx: Prisma.TransactionClient,
  orders: OpenOrder[],
  at: Date,
): Promise<number[]> {
  const ids = orders
    .filter((o) => o.status === 'pendente' || o.status === 'em_negociacao')
    .map((o) => o.id)
  if (ids.length === 0) return []
  await tx.order.updateMany({
    where: { id: { in: ids }, status: { in: ['pendente', 'em_negociacao'] } },
    data: { status: 'cancelado', updatedAt: at },
  })
  return ids
}

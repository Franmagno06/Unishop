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

export type CancelledOrders = {
  /** Pedidos cancelados. */
  ids: number[]
  /** Cobranças abertas no gateway desses pedidos: quem chama as cancela depois do commit (melhor esforço). */
  gatewayIds: string[]
}

/**
 * Cancela os pendente/em_negociacao da lista (UPDATE condicional no status), com motivo
 * `anuncio_indisponivel` (o anúncio ou a conta saiu do ar), e expira os pagamentos `pendente` desses
 * pedidos. Devolve os ids cancelados e os ids de gateway das cobranças expiradas: depois do commit,
 * quem chama deve chamar `gateway.cancelPayment` neles (backend.md §9.5), sem travar a resposta se falhar.
 * Se um Pix já pago chegar depois, a liquidação o estorna (RN-PAG-13).
 */
export async function cancelUnpaidOrders(
  tx: Prisma.TransactionClient,
  orders: OpenOrder[],
  at: Date,
): Promise<CancelledOrders> {
  const ids = orders
    .filter((o) => o.status === 'pendente' || o.status === 'em_negociacao')
    .map((o) => o.id)
  if (ids.length === 0) return { ids: [], gatewayIds: [] }
  await tx.order.updateMany({
    where: { id: { in: ids }, status: { in: ['pendente', 'em_negociacao'] } },
    data: { status: 'cancelado', cancelReason: 'anuncio_indisponivel', updatedAt: at },
  })
  const charges = await tx.payment.findMany({
    where: { orderId: { in: ids }, status: 'pendente' },
    select: { id: true, gatewayTxId: true },
  })
  if (charges.length > 0) {
    await tx.payment.updateMany({
      where: { id: { in: charges.map((c) => c.id) }, status: 'pendente' },
      data: { status: 'expirado' },
    })
  }
  const gatewayIds = charges.flatMap((c) => (c.gatewayTxId ? [c.gatewayTxId] : []))
  return { ids, gatewayIds }
}

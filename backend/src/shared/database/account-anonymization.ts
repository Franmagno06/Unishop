import type { Prisma } from '../../generated/prisma/client'
import { cancelUnpaidOrders, hasOpenPaidOrders, lockOpenOrders } from './open-orders'

// RN-PER-06, RN-ADM-06, bd.md §10. Devolve o que a anonimização grava no usuário e nos anúncios dele.
// Decisão 1 (recomendações do plano): e-mail `removido_<id>@removido.invalid` (único, nunca entregável);
// `ultimo_acesso` apagado; `data_aceite_termos` e os demais campos de controle ficam; o WhatsApp dos
// anúncios vira texto vazio (a coluna é NOT NULL).
export function anonymizedFields(userId: number): {
  user: Prisma.UserUpdateInput
  listing: Omit<Prisma.ListingUpdateManyMutationInput, 'deletedAt'>
} {
  return {
    user: {
      name: 'Usuário removido',
      email: `removido_${userId}@removido.invalid`,
      passwordHash: null,
      googleSub: null,
      whatsapp: null,
      course: null,
      photoUrl: null,
      lastSeen: null,
      accountStatus: 'excluida',
    },
    listing: { whatsapp: '' },
  }
}

export type AnonymizeResult =
  | { status: 'not_found' }
  | { status: 'blocked' }
  | { status: 'ok'; cancelledOrderIds: number[]; gatewayIds: string[]; deletedListings: number }

/**
 * Roda DENTRO da transação de quem chama. Ordem das travas: usuario -> pedido -> anuncio.
 * `blocked` (pedido pago ou com retirada combinada em aberto) não altera nada.
 */
export async function anonymizeAccountTx(
  tx: Prisma.TransactionClient,
  userId: number,
  at: Date,
): Promise<AnonymizeResult> {
  const [row] = await tx.$queryRaw<{ status: string }[]>`
    SELECT status_conta AS status FROM usuario WHERE id_usuario = ${userId} FOR UPDATE`
  if (!row || row.status === 'excluida') return { status: 'not_found' }

  const orders = await lockOpenOrders(tx, { userId })
  if (hasOpenPaidOrders(orders)) return { status: 'blocked' }

  const { ids: cancelledOrderIds, gatewayIds } = await cancelUnpaidOrders(tx, orders, at)
  const fields = anonymizedFields(userId)
  const { count } = await tx.listing.updateMany({
    where: { userId, deletedAt: null },
    data: { deletedAt: at },
  })
  // LGPD: o telefone sai de TODOS os anúncios, inclusive dos que já tinham sido excluídos antes.
  await tx.listing.updateMany({ where: { userId }, data: fields.listing })
  await tx.userToken.deleteMany({ where: { userId } })
  await tx.user.update({ where: { id: userId }, data: fields.user })
  return { status: 'ok', cancelledOrderIds, gatewayIds, deletedListings: count }
}

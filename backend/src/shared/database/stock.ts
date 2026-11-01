import type { Prisma } from '../../generated/prisma/client'

// Desconto atômico de estoque (RN-EST-03 a 06, backend.md §11): um único comando que só altera a
// linha se houver unidades. Usado pela conclusão de venda do WhatsApp e pela liquidação do pagamento.
// Quando a quantidade chega a zero o anúncio vira `vendido` no mesmo comando (o banco proíbe
// `ativo` sem estoque: ck_anuncio_ativo_com_estoque).
// `true` = havia estoque e foi descontado; `false` = o estoque não bastou (nada mudou).
export async function decrementStock(
  tx: Prisma.TransactionClient,
  listingId: number,
  quantity: number,
): Promise<boolean> {
  const changed = await tx.$executeRaw`
    UPDATE anuncio
       SET quantidade = quantidade - ${quantity},
           status     = CASE WHEN quantidade - ${quantity} = 0 THEN 'vendido' ELSE status END,
           vendido_em = CASE WHEN quantidade - ${quantity} = 0 THEN now() ELSE vendido_em END
     WHERE id_anuncio = ${listingId} AND quantidade >= ${quantity}`
  return changed === 1
}

/** Trava a linha do pedido até o fim da transação (serializa liquidações e conclusões concorrentes). */
export const lockOrder = (tx: Prisma.TransactionClient, id: number) =>
  tx.$queryRaw`SELECT id_pedido FROM pedido WHERE id_pedido = ${id} FOR UPDATE`

export const lockListingRow = (tx: Prisma.TransactionClient, id: number) =>
  tx.$queryRaw`SELECT id_anuncio FROM anuncio WHERE id_anuncio = ${id} FOR UPDATE`

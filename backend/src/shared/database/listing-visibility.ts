import type { Prisma } from '../../generated/prisma/client'

// RN-ANU-05: o ÚNICO filtro de visibilidade de anúncio. Listagem, busca, carrossel e contagem de
// categorias usam esta função, para ninguém esquecer uma das condições. Espelha a view
// `anuncio_visivel` do banco (bd.md §9): ativo, não excluído e dono com conta ativa.
export function listingVisibleWhere(): Prisma.ListingWhereInput {
  return { status: 'ativo', deletedAt: null, user: { accountStatus: 'ativa' } }
}

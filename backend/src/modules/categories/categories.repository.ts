import type { Db } from '../../shared/database/prisma'
import { listingVisibleWhere } from '../../shared/database/listing-visibility'
import type { CategoryRepository } from './categories.types'

export function createPrismaCategoryRepository(db: Db): CategoryRepository {
  return {
    // A contagem usa o filtro único de visibilidade (RN-CAT-02, RN-ANU-05). A capa de cada categoria é a
    // foto principal do primeiro anúncio VISÍVEL publicado nela (o mais antigo): o mesmo filtro garante
    // que anúncio pausado, vendido, excluído ou de dono suspenso nunca vaze a imagem.
    async listWithCounts() {
      const rows = await db.category.findMany({
        orderBy: { id: 'asc' },
        select: {
          id: true,
          name: true,
          _count: { select: { listings: { where: listingVisibleWhere() } } },
        },
      })
      // São só seis categorias fixas: uma consulta curta por categoria (índice em categoria + data).
      const covers = await Promise.all(
        rows.map((r) =>
          db.listing.findFirst({
            where: { categoryId: r.id, ...listingVisibleWhere() },
            orderBy: [{ publishedAt: 'asc' }, { id: 'asc' }],
            select: { images: { where: { position: 1 }, take: 1, select: { url: true } } },
          }),
        ),
      )
      return rows.map((r, index) => ({
        id: r.id,
        name: r.name,
        activeListingCount: r._count.listings,
        imageUrl: covers[index]?.images[0]?.url ?? null,
      }))
    },
  }
}

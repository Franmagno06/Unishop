import type { Db } from '../../shared/database/prisma'
import { listingVisibleWhere } from '../../shared/database/listing-visibility'
import type { CategoryRepository } from './categories.types'

export function createPrismaCategoryRepository(db: Db): CategoryRepository {
  return {
    // Uma consulta só: a contagem usa o filtro único de visibilidade (RN-CAT-02, RN-ANU-05).
    async listWithCounts() {
      const rows = await db.category.findMany({
        orderBy: { id: 'asc' },
        select: {
          id: true,
          name: true,
          _count: { select: { listings: { where: listingVisibleWhere() } } },
        },
      })
      return rows.map((r) => ({ id: r.id, name: r.name, activeListingCount: r._count.listings }))
    },
  }
}

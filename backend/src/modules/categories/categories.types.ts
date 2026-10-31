export type CategoryWithCount = { id: number; name: string; activeListingCount: number }

export interface CategoryRepository {
  /** As categorias em ordem de id, cada uma com a contagem de anúncios visíveis (RN-CAT-02). */
  listWithCounts(): Promise<CategoryWithCount[]>
}

// `imageUrl` é a capa da categoria: foto principal do primeiro anúncio visível publicado nela (ou null).
export type CategoryWithCount = {
  id: number
  name: string
  activeListingCount: number
  imageUrl: string | null
}

export interface CategoryRepository {
  /** As categorias em ordem de id, cada uma com a contagem de anúncios visíveis (RN-CAT-02) e a capa. */
  listWithCounts(): Promise<CategoryWithCount[]>
}

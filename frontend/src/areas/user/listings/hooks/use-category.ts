import { useQuery } from '@tanstack/react-query'
import { getCategoryById } from '../../categories/services/categories.service'

// Título e existência da categoria. `data === null` quando o id não é de nenhuma categoria.
export function useCategory(categoryId: number | null) {
  return useQuery({
    queryKey: ['category', categoryId],
    queryFn: ({ signal }) => getCategoryById(categoryId as number, signal),
    enabled: categoryId !== null,
  })
}

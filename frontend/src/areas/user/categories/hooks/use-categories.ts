import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getCategories } from '../services/categories.service'

export function useCategories(search: string) {
  return useQuery({
    queryKey: ['categories', search],
    queryFn: ({ signal }) => getCategories(search, signal),
    // Ao digitar, a lista anterior fica na tela até a nova chegar (sem piscar o esqueleto).
    placeholderData: keepPreviousData,
  })
}

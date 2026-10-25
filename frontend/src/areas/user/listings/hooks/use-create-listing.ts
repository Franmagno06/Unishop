import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createListing } from '../services/listings.service'

// RF015 · RN-ANU-07: ao publicar, a lista da categoria e a contagem de Categorias precisam
// refletir o anúncio novo, então as consultas antigas são descartadas.
export function useCreateListing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createListing,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['listings'] }),
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
      ]),
  })
}

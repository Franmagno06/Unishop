import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  arrangePickup,
  closeNegotiation,
  completeSale,
  deleteListing,
  getManagedListing,
  getMyListings,
  markListingAsSold,
  pauseListing,
  reactivateListing,
} from '../services/my-listings.service'

const myListingsKey = ['listings', 'mine'] as const

export function useMyListings() {
  return useQuery({ queryKey: myListingsKey, queryFn: ({ signal }) => getMyListings(signal) })
}

export function useManagedListing(id: number | null) {
  return useQuery({
    queryKey: [...myListingsKey, id],
    queryFn: ({ signal }) => getManagedListing(id!, signal),
    enabled: id !== null,
  })
}

// Uma mutação por ação da tela "Gerenciar anúncio". Ao terminar, a lista e o anúncio são buscados
// de novo para refletir o estado novo (e o que a regra do servidor decidiu).
// `listOnly`: ao excluir, só a lista é atualizada (a tela do anúncio excluído nem chega a refazer a busca).
function useListingAction<TVariables>(
  action: (variables: TVariables) => Promise<void>,
  listOnly = false,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: action,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myListingsKey, exact: listOnly }),
  })
}

export function useListingActions(listingId: number) {
  return {
    pause: useListingAction(() => pauseListing(listingId)),
    reactivate: useListingAction(() => reactivateListing(listingId)),
    markAsSold: useListingAction(() => markListingAsSold(listingId)),
    remove: useListingAction(() => deleteListing(listingId), true),
    arrangePickup: useListingAction((orderId: number) => arrangePickup(listingId, orderId)),
    completeSale: useListingAction((orderId: number) => completeSale(listingId, orderId)),
    closeNegotiation: useListingAction((orderId: number) => closeNegotiation(listingId, orderId)),
  }
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cancelOrder, confirmReceipt, getMyOrders } from '../services/orders.service'

export const myOrdersKey = ['orders', 'mine'] as const

export function useMyOrders() {
  return useQuery({ queryKey: myOrdersKey, queryFn: ({ signal }) => getMyOrders(signal) })
}

// Cancelar e confirmar recebimento: ao terminar, a lista é buscada de novo para refletir o estado.
function useOrderAction(action: (id: number) => Promise<void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: action,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myOrdersKey }),
  })
}

export const useCancelOrder = () => useOrderAction(cancelOrder)
export const useConfirmReceipt = () => useOrderAction(confirmReceipt)

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reviewsKey } from '../../listings/hooks/use-reviews'
import type { NewReview } from '../../listings/types/review.types'
import type { BuyerCancelReason } from '../types/order.types'
import {
  cancelOrder,
  confirmReceipt,
  getMyOrderById,
  getMyOrders,
  reportRefundNotReceived,
  requestRefund,
  reviewOrder,
} from '../services/orders.service'

export const myOrdersKey = ['orders', 'mine'] as const

export function useMyOrders() {
  return useQuery({ queryKey: myOrdersKey, queryFn: ({ signal }) => getMyOrders(signal) })
}

// Detalhes do pedido. A chave começa por `myOrdersKey`, então invalidar a lista renova este também.
export function useMyOrder(id: number | null) {
  return useQuery({
    queryKey: [...myOrdersKey, id],
    queryFn: ({ signal }) => getMyOrderById(id ?? 0, signal),
    enabled: id !== null,
  })
}

// Cancelar, confirmar recebimento e pedir reembolso: ao terminar, a lista é buscada de novo para
// refletir o estado.
function useOrderAction<TVariables>(action: (variables: TVariables) => Promise<void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: action,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myOrdersKey }),
  })
}

export const useCancelOrder = () =>
  useOrderAction(({ id, reason }: { id: number; reason: BuyerCancelReason }) => cancelOrder(id, reason))
export const useConfirmReceipt = () => useOrderAction(confirmReceipt)
export const useRequestRefund = () =>
  useOrderAction(({ id, description }: { id: number; description: string }) => requestRefund(id, description))
// Avaliar o item do pedido: atualiza o pedido (reviewed) e a lista de avaliações do anúncio.
export function useReviewOrder(listingId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, review }: { id: number; review: NewReview }) => reviewOrder(id, review),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: myOrdersKey }),
        queryClient.invalidateQueries({ queryKey: reviewsKey(listingId) }),
      ]),
  })
}
export const useReportRefundNotReceived = () => useOrderAction(reportRefundNotReceived)

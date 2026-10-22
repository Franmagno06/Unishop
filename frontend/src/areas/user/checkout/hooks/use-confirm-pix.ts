import { useMutation, useQueryClient } from '@tanstack/react-query'
import { confirmPixPayment, simulateOrderExpiry } from '../../orders/services/orders.service'

// Botão "Já paguei". Na demonstração marca o pedido como Pago; com a API só consulta o pedido.
export function useConfirmPix(orderId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => confirmPixPayment(orderId),
    onSuccess: (order) => queryClient.setQueryData(['order', orderId], order),
    onError: () => queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
  })
}

// Controle da demonstração (só aparece em `npm run dev`): vence o Pix na hora.
export function useSimulatePixExpiry(orderId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => simulateOrderExpiry(orderId),
    onSuccess: (order) => queryClient.setQueryData(['order', orderId], order),
  })
}

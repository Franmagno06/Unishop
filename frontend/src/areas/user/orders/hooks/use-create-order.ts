import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createOrder } from '../services/orders.service'

// RN-PED-10: o pedido novo (ou o aberto que foi reaproveitado) já entra no cache, e a tela de
// pagamento abre sem esperar outra consulta.
export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createOrder,
    onSuccess: (order) => {
      queryClient.setQueryData(['order', order.id], order)
    },
  })
}

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { ApiError } from '../../../../shared/lib/api'
import { payWithCard } from '../../orders/services/orders.service'
import type { CardPaymentInput, Order } from '../../orders/types/order.types'

type CardPaymentState =
  | { status: 'idle' | 'pending' }
  | { status: 'failed'; error: ApiError | Error }

// Pagamento com cartão (RN-PAG-02 e 07). Não usa useMutation de propósito: o TanStack Query
// guarda as variáveis de cada mutação no cache, e os dados do cartão não podem ficar lá.
export function usePayWithCard(orderId: number) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<CardPaymentState>({ status: 'idle' })

  const pay = useCallback(
    async (card: CardPaymentInput): Promise<Order | null> => {
      setState({ status: 'pending' })
      try {
        const order = await payWithCard(orderId, card)
        queryClient.setQueryData(['order', orderId], order)
        setState({ status: 'idle' })
        return order
      } catch (error) {
        // Pedido cancelado no meio do caminho: a consulta do pedido mostra o estado certo.
        if (error instanceof ApiError && error.code === 'ORDER_CANCELLED') {
          void queryClient.invalidateQueries({ queryKey: ['order', orderId] })
        }
        setState({ status: 'failed', error: error instanceof Error ? error : new Error('Falha no pagamento.') })
        return null
      }
    },
    [orderId, queryClient],
  )

  return { pay, state }
}

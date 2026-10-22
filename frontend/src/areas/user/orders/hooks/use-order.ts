import { useQuery } from '@tanstack/react-query'
import { ApiError } from '../../../../shared/lib/api'
import { getOrderById } from '../services/orders.service'

const POLL_MS = 5000

// Consulta o pedido. Enquanto ele está Pendente, repete a cada 5 s: é assim que a tela fica
// sabendo do pagamento (RN-PAG-05 e 11) e do vencimento (RN-PAG-12).
export function useOrder(orderId: number | null) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: ({ signal }) => getOrderById(orderId as number, signal),
    enabled: orderId !== null,
    // 403 e 404 não melhoram com nova tentativa.
    retry: (count, error) => !(error instanceof ApiError && (error.status === 403 || error.status === 404)) && count < 1,
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? POLL_MS : false),
  })
}

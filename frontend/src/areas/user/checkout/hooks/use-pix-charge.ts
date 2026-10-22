import { useQuery } from '@tanstack/react-query'
import { createPixCharge } from '../../orders/services/orders.service'

// Gera o Pix quando a aba abre (POST /payments/pix). Repetir devolve a mesma cobrança, então
// trocar de aba e voltar não cria outro código (RN-PAG-04).
export function usePixCharge(orderId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['pix', orderId],
    queryFn: () => createPixCharge(orderId),
    enabled,
    staleTime: Infinity,
    retry: false,
  })
}

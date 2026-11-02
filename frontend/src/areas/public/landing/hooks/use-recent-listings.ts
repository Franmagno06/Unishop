import { useQuery } from '@tanstack/react-query'
import { getRecentListings } from '../services/recent.service'

// RF001.4: anúncios recentes da tela inicial. Uma consulta por minuto basta (a home é a página mais
// aberta e a rota é pública); `retry: false` deixa o aviso de erro aparecer logo, com "Tentar de novo".
export function useRecentListings() {
  return useQuery({
    queryKey: ['landing', 'recent'],
    queryFn: ({ signal }) => getRecentListings(undefined, signal),
    staleTime: 60_000,
    retry: false,
  })
}

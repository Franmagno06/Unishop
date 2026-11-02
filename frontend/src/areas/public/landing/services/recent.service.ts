import { api } from '../../../../shared/lib/api'
import { MOCK_MODE } from '../../../../shared/lib/mock-mode'

// Carrossel da tela inicial (RF001.4): GET /listings/recent?limit= é a única rota de catálogo pública
// (sem login, sem contato nem vendedor, RN-PER-04). Em modo de demonstração (MOCK_MODE) as chamadas
// vão para `recent.mock.ts`; o `import.meta.env.DEV` escrito aqui é o que deixa o Vite apagar o código
// de exemplo do build de produção.
export type RecentListing = {
  id: number
  title: string
  category: string
  priceInCents: number
  imageUrl: string | null
}

// Formato da API (listings.serializer.ts do backend): só o que o card usa é lido.
type ApiRecent = {
  id: number
  title: string
  priceInCents: number
  categoryName: string
  imageUrl: string | null
}

export const RECENT_LIMIT = 10 // padrão do backend; máximo 20

export async function getRecentListings(
  limit = RECENT_LIMIT,
  signal?: AbortSignal,
): Promise<RecentListing[]> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./recent.mock')).getRecentListings()
  const response = await api<{ data: ApiRecent[] }>(`/listings/recent?limit=${limit}`, { signal })
  return response.data.map((item) => ({
    id: item.id,
    title: item.title,
    category: item.categoryName,
    priceInCents: item.priceInCents,
    imageUrl: item.imageUrl,
  }))
}

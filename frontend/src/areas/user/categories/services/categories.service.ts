import { api } from '../../../../shared/lib/api'
import { MOCK_MODE } from '../../../../shared/lib/mock-mode'

// GET /categories?search= devolve { data: [{ id, name, activeListingCount }] } (backend.md §9.3,
// RN-CAT-01 a 04). Em modo de demonstração (MOCK_MODE) as chamadas vão para `categories.mock.ts`;
// o `import.meta.env.DEV` escrito aqui é o que deixa o Vite apagar o código de exemplo do build.
export type Category = {
  id: number
  name: string
  activeListingCount: number
}

export async function getCategories(search = '', signal?: AbortSignal): Promise<Category[]> {
  if (import.meta.env.DEV && MOCK_MODE) {
    return (await import('./categories.mock')).getCategories(search, signal)
  }
  const term = search.trim()
  const query = term ? `?search=${encodeURIComponent(term)}` : ''
  const response = await api<{ data: Category[] }>(`/categories${query}`, { signal })
  return response.data
}

// A API não tem GET /categories/:id (backend.md §9.3): o título da tela de cada categoria sai
// da lista de categorias. null = categoria que não existe.
export async function getCategoryById(id: number, signal?: AbortSignal): Promise<Category | null> {
  const categories = await getCategories('', signal)
  return categories.find((category) => category.id === id) ?? null
}

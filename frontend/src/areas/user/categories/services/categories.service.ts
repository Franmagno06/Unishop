import { listingCountByCategory } from '../../listings/services/listings.data'

// Dados de exemplo (os do Figma, tela 04) no formato do contrato de backend.md §9.3:
// GET /categories?search= devolve { id, name, activeListingCount } (RN-CAT-01 a 03).
// As contagens vêm dos anúncios de exemplo, para a tela de Categorias e a lista de cada
// categoria nunca divergirem. Quando a API existir, só este arquivo muda.
export type Category = {
  id: number
  name: string
  activeListingCount: number
}

const categoryNames = [
  { id: 1, name: 'Livros e apostilas' },
  { id: 2, name: 'Eletrônicos' },
  { id: 3, name: 'Alimentos' },
  { id: 4, name: 'Materiais de curso' },
  { id: 5, name: 'Vestuário' },
  { id: 6, name: 'Outros' },
]

// Calculado a cada chamada: um anúncio novo (tela Anunciar item) muda a contagem na hora.
const listExampleCategories = (): Category[] =>
  categoryNames.map((category) => ({
    ...category,
    activeListingCount: listingCountByCategory(category.id),
  }))

// Busca sem diferenciar maiúsculas nem acentos: "eletronicos" encontra "Eletrônicos".
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export async function getCategories(search = '', signal?: AbortSignal): Promise<Category[]> {
  signal?.throwIfAborted()
  const term = normalize(search)
  const exampleCategories = listExampleCategories()
  if (!term) return exampleCategories
  return exampleCategories.filter((category) => normalize(category.name).includes(term))
}

// A API não tem GET /categories/:id (backend.md §9.3): o título da tela de cada categoria sai
// da lista de categorias. null = categoria que não existe.
export async function getCategoryById(id: number, signal?: AbortSignal): Promise<Category | null> {
  const categories = await getCategories('', signal)
  return categories.find((category) => category.id === id) ?? null
}

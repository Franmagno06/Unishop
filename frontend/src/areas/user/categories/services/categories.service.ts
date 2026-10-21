// Dados de exemplo (os do Figma, tela 04) no formato do contrato de backend.md §9.3:
// GET /categories?search= devolve { id, name, activeListingCount } (RN-CAT-01 a 03).
// Quando a API existir, só esta função muda: api<{ data: Category[] }>('/categories', ...).
export type Category = {
  id: number
  name: string
  activeListingCount: number
}

const exampleCategories: Category[] = [
  { id: 1, name: 'Livros e apostilas', activeListingCount: 48 },
  { id: 2, name: 'Eletrônicos', activeListingCount: 21 },
  { id: 3, name: 'Alimentos', activeListingCount: 35 },
  { id: 4, name: 'Materiais de curso', activeListingCount: 27 },
  { id: 5, name: 'Vestuário', activeListingCount: 12 },
  { id: 6, name: 'Outros', activeListingCount: 9 },
]

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
  if (!term) return exampleCategories
  return exampleCategories.filter((category) => normalize(category.name).includes(term))
}

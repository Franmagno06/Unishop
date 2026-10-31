import type { CategoryRepository } from './categories.types'

// Sem diferenciar maiúsculas nem acentos: "eletronicos" encontra "Eletrônicos".
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

export function createCategoriesService({ categories }: { categories: CategoryRepository }) {
  // RN-CAT-01 a 03. São só seis categorias fixas: o filtro por texto é feito aqui, não no banco.
  async function list(search?: string) {
    const all = await categories.listWithCounts()
    const term = normalize(search ?? '')
    return term ? all.filter((c) => normalize(c.name).includes(term)) : all
  }

  return { list }
}
export type CategoriesService = ReturnType<typeof createCategoriesService>

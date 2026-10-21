import { describe, expect, it } from 'vitest'
import { getCategories } from './categories.service'

describe('getCategories (dados de exemplo)', () => {
  it('devolve as 6 categorias fixas (RN-CAT-01)', async () => {
    const categories = await getCategories()
    expect(categories.map((category) => category.name)).toEqual([
      'Livros e apostilas',
      'Eletrônicos',
      'Alimentos',
      'Materiais de curso',
      'Vestuário',
      'Outros',
    ])
  })

  it('cada categoria traz a contagem de anúncios ativos (RN-CAT-02)', async () => {
    const [first] = await getCategories()
    expect(first).toEqual({ id: 1, name: 'Livros e apostilas', activeListingCount: 48 })
  })

  it('a busca ignora maiúsculas e acentos (RN-CAT-03)', async () => {
    expect((await getCategories('ELETRONICOS')).map((c) => c.name)).toEqual(['Eletrônicos'])
    expect((await getCategories('  livros  ')).map((c) => c.name)).toEqual(['Livros e apostilas'])
  })

  it('busca sem resultado devolve lista vazia', async () => {
    expect(await getCategories('xyz')).toEqual([])
  })

  it('respeita o cancelamento da requisição', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(getCategories('', controller.signal)).rejects.toThrow()
  })
})

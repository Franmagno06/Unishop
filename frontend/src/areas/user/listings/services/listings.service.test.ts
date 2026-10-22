import { describe, expect, it } from 'vitest'
import { getCategories } from '../../categories/services/categories.service'
import { exampleListings, listingCountByCategory } from './listings.data'
import { getListings, PAGE_SIZE } from './listings.service'

describe('anúncios de exemplo', () => {
  it('cada categoria tem a contagem da tela de Categorias (48, 21, 35, 27, 12 e 9)', async () => {
    const counts = (await getCategories()).map((category) => category.activeListingCount)
    expect(counts).toEqual([48, 21, 35, 27, 12, 9])

    for (const category of await getCategories()) {
      const generated = exampleListings.filter((listing) => listing.categoryId === category.id)
      expect(generated).toHaveLength(category.activeListingCount)
      expect(listingCountByCategory(category.id)).toBe(category.activeListingCount)
    }
  })

  it('os 8 primeiros de "Livros e apostilas" são os do Figma (nome, preço e contato)', async () => {
    const { items } = await getListings({ categoryId: 1, limit: 8 })

    expect(
      items.map((item) => [item.title, item.priceInCents / 100, item.contact.mode, item.contact.place]),
    ).toEqual([
      ['Cálculo I — Guidorizzi, vol. 1', 45, 'site', undefined],
      ['Física I — Halliday, 10ª ed.', 60, 'campus', 'Bloco K · Horário EF'],
      ['Apostila de Anatomia Humana', 25, 'whatsapp', undefined],
      ['Algoritmos — Cormen', 90, 'site', undefined],
      ['Química Geral — Russell', 40, 'campus', 'Bloco D · Horário CD'],
      ['Direito Constitucional — Lenza', 55, 'whatsapp', undefined],
      ['Estatística Básica — Bussab', 35, 'site', undefined],
      ['Introdução à Economia — Mankiw', 50, 'campus', 'Bloco A · Horário AB'],
    ])
  })

  it('os ids são únicos, os preços são fictícios e em centavos inteiros, e só o campus tem local', () => {
    expect(new Set(exampleListings.map((l) => l.id)).size).toBe(exampleListings.length)

    for (const listing of exampleListings) {
      expect(Number.isInteger(listing.priceInCents)).toBe(true)
      expect(listing.priceInCents).toBeGreaterThan(0)
      expect(listing.priceInCents).toBeLessThanOrEqual(9_999_999) // até R$ 99.999,99 (RN-ANU-02)
      expect(Boolean(listing.contact.place)).toBe(listing.contact.mode === 'campus')
      expect(listing.imageUrl).toBeNull()
    }
  })

  it('é determinístico: o mesmo resultado em todas as execuções', async () => {
    const first = await getListings({ categoryId: 2, limit: 50 })
    const second = await getListings({ categoryId: 2, limit: 50 })
    expect(second).toEqual(first)
  })
})

describe('getListings · paginação (RF007)', () => {
  it('devolve 12 por vez, com o total e se há próxima página', async () => {
    const first = await getListings({ categoryId: 1 })

    expect(PAGE_SIZE).toBe(12)
    expect(first.items).toHaveLength(12)
    expect([first.total, first.page, first.pageSize, first.hasNext]).toEqual([48, 1, 12, true])
  })

  it('a última página vem sem próxima', async () => {
    const last = await getListings({ categoryId: 1, page: 4 })
    expect(last.items).toHaveLength(12)
    expect(last.hasNext).toBe(false)

    const partial = await getListings({ categoryId: 2, page: 2 }) // 21 anúncios: 12 + 9
    expect(partial.items).toHaveLength(9)
    expect(partial.hasNext).toBe(false)
  })

  it('juntar todas as páginas dá todos os anúncios, sem repetir nenhum', async () => {
    const ids: number[] = []
    for (let page = 1; page <= 4; page++) {
      ids.push(...(await getListings({ categoryId: 1, page })).items.map((item) => item.id))
    }
    expect(ids).toHaveLength(48)
    expect(new Set(ids).size).toBe(48)
  })

  it('página além do fim vem vazia', async () => {
    const beyond = await getListings({ categoryId: 6, page: 5 })
    expect(beyond.items).toEqual([])
    expect(beyond.hasNext).toBe(false)
  })

  it('categoria que não existe: nenhum anúncio', async () => {
    const none = await getListings({ categoryId: 99 })
    expect([none.items, none.total, none.hasNext]).toEqual([[], 0, false])
  })

  it('só devolve anúncios da categoria pedida', async () => {
    const { items } = await getListings({ categoryId: 3, limit: 50 })
    expect(items.every((item) => item.categoryId === 3)).toBe(true)
  })
})

describe('getListings · filtro e ordem', () => {
  it('filtra pela forma de contato e o total acompanha o filtro', async () => {
    const campus = await getListings({ categoryId: 1, contact: 'campus', limit: 50 })

    expect(campus.total).toBe(16)
    expect(campus.items.every((item) => item.contact.mode === 'campus')).toBe(true)
    expect(campus.items.every((item) => Boolean(item.contact.place))).toBe(true)
  })

  it('a soma dos três filtros é o total da categoria', async () => {
    const totals = await Promise.all(
      (['site', 'campus', 'whatsapp'] as const).map(async (contact) => (await getListings({ categoryId: 1, contact })).total),
    )
    expect(totals.reduce((sum, n) => sum + n, 0)).toBe(48)
  })

  it('por padrão, do mais recente para o mais antigo (RN-ANU-07)', async () => {
    const { items } = await getListings({ categoryId: 1, limit: 50 })
    const dates = items.map((item) => item.publishedAt)
    expect(dates).toEqual([...dates].sort().reverse())
  })

  it('"Menor preço" ordena do mais barato ao mais caro, e empate fica do mais recente', async () => {
    const { items } = await getListings({ categoryId: 1, sort: 'price_asc', limit: 50 })
    const prices = items.map((item) => item.priceInCents)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))

    const tie = items.filter((item) => item.priceInCents === prices[0])
    const tieDates = tie.map((item) => item.publishedAt)
    expect(tieDates).toEqual([...tieDates].sort().reverse())
  })

  it('"Maior preço" ordena do mais caro ao mais barato', async () => {
    const { items } = await getListings({ categoryId: 1, sort: 'price_desc', limit: 50 })
    const prices = items.map((item) => item.priceInCents)
    expect(prices).toEqual([...prices].sort((a, b) => b - a))
  })

  it('a ordem vale para a lista inteira, não só para a página (página 2 continua a ordem)', async () => {
    const page1 = (await getListings({ categoryId: 1, sort: 'price_asc', page: 1 })).items
    const page2 = (await getListings({ categoryId: 1, sort: 'price_asc', page: 2 })).items
    expect(page2[0]!.priceInCents).toBeGreaterThanOrEqual(page1.at(-1)!.priceInCents)
  })

  it('respeita o cancelamento da requisição', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(getListings({ categoryId: 1, signal: controller.signal })).rejects.toThrow()
  })
})

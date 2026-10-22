import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exampleImageCount, exampleImages } from './example-images'
import { exampleListings } from './listings.data'
import { createListing, getListingById, getListings } from './listings.service'

describe('fotos de exemplo', () => {
  it('cada anúncio tem de 1 a 5 fotos; o nº 1 tem 3, como o Figma', () => {
    expect(exampleImageCount(1)).toBe(3)
    for (const { id } of exampleListings) {
      expect(exampleImageCount(id)).toBeGreaterThanOrEqual(1)
      expect(exampleImageCount(id)).toBeLessThanOrEqual(5)
    }
    expect(new Set(exampleListings.map((l) => exampleImageCount(l.id)))).toEqual(new Set([1, 2, 3, 4, 5]))
  })

  it('as fotos de um mesmo anúncio são diferentes entre si e a 1ª é a capa do card', () => {
    const listing = exampleListings[0]!
    const images = exampleImages(listing.id, listing.categoryId, listing.title)
    expect(new Set(images).size).toBe(images.length)
    expect(images[0]).toBe(listing.imageUrl)
  })

  it('um título com caractere especial não quebra o desenho', () => {
    expect(() => exampleImages(99, 1, '<script>&"\'')).not.toThrow()
    expect(exampleImages(99, 1, '<b>')[0]).not.toContain('<b>')
  })
})

describe('getListingById (dados de exemplo)', () => {
  it('o anúncio nº 1 é o do Figma: Ana Lima, Engenharia Civil, 3 fotos', async () => {
    const detail = (await getListingById(1))!
    expect(detail).toMatchObject({
      id: 1,
      title: 'Cálculo I — Guidorizzi, vol. 1',
      priceInCents: 4500,
      categoryId: 1,
      quantity: 1,
      isOwn: false,
      seller: { name: 'Ana Lima', course: 'Engenharia Civil' },
    })
    expect(detail.description).toMatch(/^Livro em ótimo estado, 5ª edição/)
    expect(detail.images).toHaveLength(3)
  })

  it('todo anúncio de exemplo tem descrição (10 a 2.000 caracteres), vendedor e quantidade de 1 a 999', async () => {
    for (const { id } of exampleListings) {
      const detail = (await getListingById(id))!
      expect(detail.description.length).toBeGreaterThanOrEqual(10)
      expect(detail.description.length).toBeLessThanOrEqual(2000)
      expect(detail.seller.name.length).toBeGreaterThan(0)
      expect(detail.quantity).toBeGreaterThanOrEqual(1)
      expect(detail.quantity).toBeLessThanOrEqual(999)
      expect(detail.isOwn).toBe(false)
    }
  })

  it('é estável: o mesmo anúncio devolve o mesmo detalhe', async () => {
    expect(await getListingById(7)).toEqual(await getListingById(7))
  })

  it('id que não existe devolve null', async () => {
    expect(await getListingById(999_999)).toBeNull()
  })
})

describe('createListing → detalhe e capa', () => {
  const created: string[] = []
  beforeEach(() => {
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn((file: File) => {
          const url = `blob:teste/${file.name}`
          created.push(url)
          return url
        }),
      }),
    )
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    created.length = 0
  })

  const base = {
    categoryId: 1,
    description: 'Descrição digitada pela pessoa.',
    priceInCents: 2500,
    quantity: 4,
    whatsapp: '85999990000',
  }

  it('a primeira foto vira a capa do card; todas vão para a galeria do produto', async () => {
    const files = [new File(['a'], 'primeira.png'), new File(['b'], 'segunda.png'), new File(['c'], 'terceira.png')]
    const { id } = await createListing({ ...base, title: 'Com fotos', images: files })

    const card = (await getListings({ categoryId: 1 })).items[0]!
    expect(card.title).toBe('Com fotos')
    expect(card.imageUrl).toBe('blob:teste/primeira.png')

    const detail = (await getListingById(id))!
    expect(detail.images).toEqual(['blob:teste/primeira.png', 'blob:teste/segunda.png', 'blob:teste/terceira.png'])
  })

  it('o detalhe guarda o que a pessoa digitou e marca o anúncio como dela', async () => {
    const { id } = await createListing({ ...base, title: 'Meu anúncio', images: [new File(['a'], 'a.png')] })
    expect(await getListingById(id)).toMatchObject({
      title: 'Meu anúncio',
      description: 'Descrição digitada pela pessoa.',
      quantity: 4,
      priceInCents: 2500,
      isOwn: true,
    })
  })

  it('sem fotos, o card fica sem capa (bloco azul-claro)', async () => {
    await createListing({ ...base, categoryId: 6, title: 'Sem foto alguma', images: [] })
    expect((await getListings({ categoryId: 6 })).items[0]!.imageUrl).toBeNull()
  })
})

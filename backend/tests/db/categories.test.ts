import { beforeEach, describe, expect, it } from 'vitest'
import { createPrismaCategoryRepository } from '../../src/modules/categories/categories.repository'
import { createListing, createUser, resetDb, testDb } from '../helpers/db'

beforeEach(resetDb)

const countOf = async (id: number) =>
  (await createPrismaCategoryRepository(testDb).listWithCounts()).find((c) => c.id === id)
    ?.activeListingCount

describe('categories.repository (banco real)', () => {
  it('RN-CAT-01: devolve as seis categorias em ordem de id, com contagem zero', async () => {
    const rows = await createPrismaCategoryRepository(testDb).listWithCounts()
    expect(rows.map((r) => r.id)).toEqual([1, 2, 3, 4, 5, 6])
    expect(rows.every((r) => r.activeListingCount === 0)).toBe(true)
  })

  it('RN-CAT-02 e RN-ANU-05: conta só anúncio ativo, não excluído, de dono com conta ativa', async () => {
    const owner = await createUser()
    const suspended = await createUser({ accountStatus: 'suspensa' })
    const deleted = await createUser({ accountStatus: 'excluida' })

    await createListing(owner.id, { categoryId: 1 }) // visível
    await createListing(owner.id, { categoryId: 1 }) // visível
    await createListing(owner.id, { categoryId: 1, status: 'pausado' })
    await createListing(owner.id, { categoryId: 1, status: 'vendido', quantity: 0 })
    await createListing(owner.id, { categoryId: 1, deletedAt: new Date() })
    await createListing(suspended.id, { categoryId: 1 })
    await createListing(deleted.id, { categoryId: 1 })

    expect(await countOf(1)).toBe(2)
    expect(await countOf(2)).toBe(0)
  })

  it('RN-ANU-05: o filtro do repository bate com a view anuncio_visivel do banco', async () => {
    const owner = await createUser()
    const suspended = await createUser({ accountStatus: 'suspensa' })
    await createListing(owner.id, { categoryId: 3 })
    await createListing(owner.id, { categoryId: 3, status: 'pausado' })
    await createListing(suspended.id, { categoryId: 3 })

    const [{ n }] = await testDb.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM anuncio_visivel WHERE id_categoria = 3`
    expect(await countOf(3)).toBe(Number(n))
    expect(Number(n)).toBe(1)
  })

  // Capa da categoria: a foto principal do primeiro anúncio visível que foi publicado nela.
  const withImage = async (userId: number, categoryId: number, url: string, extra = {}) => {
    const listing = await createListing(userId, { categoryId, ...extra })
    await testDb.listingImage.create({ data: { listingId: listing.id, position: 1, url, publicId: url } })
    return listing
  }
  const coverOf = async (id: number) =>
    (await createPrismaCategoryRepository(testDb).listWithCounts()).find((c) => c.id === id)?.imageUrl

  it('categoria sem anúncio visível não tem capa', async () => {
    expect(await coverOf(1)).toBeNull()
  })

  it('a capa é a foto do anúncio visível mais antigo da categoria, mesmo que haja outros mais novos', async () => {
    const owner = await createUser()
    await withImage(owner.id, 1, 'http://x/novo.png', { publishedAt: new Date('2026-10-20T10:00:00Z') })
    await withImage(owner.id, 1, 'http://x/antigo.png', { publishedAt: new Date('2026-10-01T10:00:00Z') })
    await withImage(owner.id, 2, 'http://x/outra-categoria.png', { publishedAt: new Date('2026-09-01T10:00:00Z') })

    expect(await coverOf(1)).toBe('http://x/antigo.png')
    expect(await coverOf(2)).toBe('http://x/outra-categoria.png')
    expect(await coverOf(3)).toBeNull()
  })

  it('RN-ANU-05: anúncio pausado, vendido, excluído ou de dono suspenso nunca vira capa (não vaza imagem oculta)', async () => {
    const owner = await createUser()
    const suspended = await createUser({ accountStatus: 'suspensa' })
    const old = new Date('2026-01-01T10:00:00Z')
    await withImage(owner.id, 4, 'http://x/pausado.png', { status: 'pausado', publishedAt: old })
    await withImage(owner.id, 4, 'http://x/vendido.png', { status: 'vendido', quantity: 0, publishedAt: old })
    await withImage(owner.id, 4, 'http://x/excluido.png', { deletedAt: new Date(), publishedAt: old })
    await withImage(suspended.id, 4, 'http://x/suspenso.png', { publishedAt: old })
    await withImage(owner.id, 4, 'http://x/visivel.png', { publishedAt: new Date('2026-10-10T10:00:00Z') })

    expect(await coverOf(4)).toBe('http://x/visivel.png')
  })

  it('usa a foto principal (posição 1), não a segunda', async () => {
    const owner = await createUser()
    const listing = await withImage(owner.id, 5, 'http://x/principal.png')
    await testDb.listingImage.create({ data: { listingId: listing.id, position: 2, url: 'http://x/segunda.png', publicId: 'b' } })
    expect(await coverOf(5)).toBe('http://x/principal.png')
  })
})

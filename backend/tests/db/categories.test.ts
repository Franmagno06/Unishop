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
})

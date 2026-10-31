import { beforeEach, describe, expect, it } from 'vitest'
import { createListing, createUser, resetDb, testDb } from '../helpers/db'

// Testes de integridade do bd.md §14: o banco precisa recusar o que as regras proíbem.
beforeEach(resetDb)

describe('integridade do banco (bd.md §14)', () => {
  it('RN-ANU-02: recusa preço negativo ou acima de R$ 99.999,99', async () => {
    const owner = await createUser()
    await expect(createListing(owner.id, { price: '-5.00' })).rejects.toThrow()
    await expect(createListing(owner.id, { price: '100000.00' })).rejects.toThrow()
  })

  it('RN-EST-05: recusa estoque negativo e anúncio ativo sem unidades', async () => {
    const owner = await createUser()
    await expect(createListing(owner.id, { quantity: -1 })).rejects.toThrow()
    await expect(createListing(owner.id, { quantity: 0, status: 'ativo' })).rejects.toThrow()
    await expect(createListing(owner.id, { quantity: 0, status: 'vendido' })).resolves.toBeTruthy()
  })

  it('RN-ANU-03: recusa a 6ª imagem e ordem repetida', async () => {
    const listing = await createListing((await createUser()).id)
    const image = (position: number) =>
      testDb.listingImage.create({
        data: {
          listingId: listing.id,
          url: `http://x/${position}.png`,
          publicId: `p${position}`,
          position,
        },
      })
    for (const position of [1, 2, 3, 4, 5]) await image(position)
    await expect(image(6)).rejects.toThrow()
    await expect(image(3)).rejects.toThrow()
  })

  it('RN-ACE-03: recusa e-mails que só diferem em maiúsculas', async () => {
    await createUser({ email: 'ana@edu.unifor.br' })
    await expect(createUser({ email: 'ANA@edu.unifor.br' })).rejects.toThrow()
  })
})

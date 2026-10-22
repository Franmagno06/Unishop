import { describe, expect, it } from 'vitest'
import { ApiError } from '../../../../shared/lib/api'
import { createListing, getListings, getProfileWhatsapp } from './listings.service'

const base = {
  title: 'Item do teste de serviço',
  description: 'Descrição de teste.',
  priceInCents: 1234,
  quantity: 2,
  whatsapp: '85999990000',
  images: [],
}

describe('createListing (dados de exemplo)', () => {
  it('devolve id, título e o nome da categoria para o pop-up', async () => {
    const created = await createListing({ ...base, categoryId: 2 })
    expect(created).toMatchObject({ title: base.title, categoryId: 2, categoryName: 'Eletrônicos' })
    expect(created.id).toBeGreaterThan(0)
  })

  it('o anúncio novo é o primeiro da lista da própria categoria e não aparece nas outras', async () => {
    await createListing({ ...base, categoryId: 3, title: 'Só em Alimentos' })

    expect((await getListings({ categoryId: 3 })).items[0]!.title).toBe('Só em Alimentos')
    expect((await getListings({ categoryId: 4 })).items.map((i) => i.title)).not.toContain('Só em Alimentos')
  })

  it('cada anúncio recebe um id diferente', async () => {
    const a = await createListing({ ...base, categoryId: 5 })
    const b = await createListing({ ...base, categoryId: 5 })
    expect(b.id).not.toBe(a.id)
  })

  it('categoria que não existe é recusada com 400', async () => {
    await expect(createListing({ ...base, categoryId: 99 })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
    await expect(createListing({ ...base, categoryId: 99 })).rejects.toBeInstanceOf(ApiError)
  })

  it('o WhatsApp do perfil vem só com dígitos', async () => {
    expect(await getProfileWhatsapp()).toMatch(/^\d{10,11}$/)
  })
})

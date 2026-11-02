import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../shared/lib/mock-mode', () => ({ MOCK_MODE: false }))
const api = vi.fn()
vi.mock('../../../../shared/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../shared/lib/api')>()),
  api: (...args: unknown[]) => api(...args),
}))

import { getRecentListings } from './recent.service'

beforeEach(() => api.mockReset())

describe('getRecentListings · RF001.4', () => {
  it('pede GET /listings/recent?limit=10 (rota pública do carrossel)', async () => {
    api.mockResolvedValue({ data: [] })
    await getRecentListings()
    expect(api).toHaveBeenCalledWith('/listings/recent?limit=10', expect.anything())
  })

  it('converte categoryName em category e mantém preço em centavos e imagem', async () => {
    api.mockResolvedValue({
      data: [
        {
          id: 7, title: 'Cálculo I', priceInCents: 4500, categoryId: 1, categoryName: 'Livros e apostilas',
          imageUrl: 'http://x/a.jpg', publishedAt: '2026-11-01T10:00:00.000Z',
        },
      ],
    })
    expect(await getRecentListings()).toEqual([
      { id: 7, title: 'Cálculo I', category: 'Livros e apostilas', priceInCents: 4500, imageUrl: 'http://x/a.jpg' },
    ])
  })

  it('lista vazia devolve []', async () => {
    api.mockResolvedValue({ data: [] })
    expect(await getRecentListings()).toEqual([])
  })
})

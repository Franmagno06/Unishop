import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../../shared/lib/api'

vi.mock('../../../../shared/lib/mock-mode', () => ({ MOCK_MODE: false }))
const api = vi.fn()
vi.mock('../../../../shared/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../shared/lib/api')>()),
  api: (...args: unknown[]) => api(...args),
}))

import {
  deleteProduct,
  getCategories,
  getProductDetail,
  getProductStats,
  listProducts,
  updateProduct,
} from './products.service'

const row = {
  id: 3,
  title: 'Cálculo vol. 1',
  description: 'Livro em bom estado',
  priceInCents: 4500,
  categoryId: 1,
  categoryName: 'Livros e apostilas',
  status: 'active',
  imageUrl: null,
  seller: { id: 9, name: 'Ana Lima' },
  publishedAt: '2026-10-20T10:00:00.000Z',
}

const detail = {
  id: 3,
  title: 'Cálculo vol. 1',
  description: 'Livro em bom estado',
  priceInCents: 4500,
  quantity: 2,
  categoryId: 1,
  categoryName: 'Livros e apostilas',
  status: 'sold',
  whatsapp: '85999990000',
  seller: { id: 9, name: 'Ana Lima', email: 'ana@edu.unifor.br', whatsapp: null },
  images: [{ id: 5, url: 'https://img/1.jpg', position: 0 }],
  views: 12,
  whatsappContacts: 3,
  publishedAt: '2026-10-20T10:00:00.000Z',
}

beforeEach(() => api.mockReset())

describe('API real · produtos do admin', () => {
  it('RN-ADM-07: listProducts manda page, limit=6, search e category (não categoryId)', async () => {
    api.mockResolvedValue({ data: [row], meta: { page: 1, limit: 6, total: 1, totalPages: 1 } })
    const page = await listProducts({ search: 'cálculo', categoryId: 1, page: 1 })
    expect(api).toHaveBeenCalledWith(
      '/admin/listings?page=1&limit=6&search=c%C3%A1lculo&category=1',
      expect.anything(),
    )
    expect(page).toMatchObject({ total: 1, pageSize: 6 })
  })

  it('linha da lista traz a descrição e, sem imagem, vira produto sem imagem', async () => {
    api.mockResolvedValue({ data: [row], meta: { page: 1, limit: 6, total: 1, totalPages: 1 } })
    const [product] = (await listProducts({ search: '', categoryId: null, page: 1 })).items
    expect(product).toMatchObject({ id: 3, description: 'Livro em bom estado', images: [], seller: { id: 9, name: 'Ana Lima' } })
    expect(api).toHaveBeenCalledWith('/admin/listings?page=1&limit=6', expect.anything())
  })

  it('RN-ADM-07: getProductStats devolve ativos, pausados e vendidos no mês', async () => {
    api.mockResolvedValue({ data: { active: 4, paused: 1, soldInMonth: 2 } })
    expect(await getProductStats()).toEqual({ active: 4, paused: 1, soldInMonth: 2 })
  })

  it('RF023: getProductDetail mapeia vendedor sem WhatsApp, imagens e contadores', async () => {
    api.mockResolvedValue({ data: detail })
    const product = await getProductDetail(3)
    expect(product).toMatchObject({
      whatsapp: '85999990000',
      views: 12,
      whatsappContacts: 3,
      seller: { id: 9, email: 'ana@edu.unifor.br', whatsapp: '' },
      images: [{ id: 5, url: 'https://img/1.jpg' }],
    })
  })

  it('getProductDetail devolve null no 404', async () => {
    api.mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND', 'x'))
    expect(await getProductDetail(99)).toBeNull()
  })

  it('RN-ADM-08: updateProduct envia só {status}; Vendido volta a Ativo (reversão pelo admin)', async () => {
    api.mockResolvedValue({ data: { ...detail, status: 'active' } })
    const product = await updateProduct(3, { status: 'active' })
    expect(api).toHaveBeenCalledWith('/admin/listings/3', { method: 'PATCH', body: { status: 'active' } })
    expect(product.status).toBe('active')
  })

  it('RN-ADM-09: deleteProduct chama DELETE e relança 409 HAS_OPEN_PAID_ORDERS', async () => {
    api.mockResolvedValueOnce(undefined)
    await deleteProduct(3)
    expect(api).toHaveBeenCalledWith('/admin/listings/3', { method: 'DELETE' })
    api.mockRejectedValueOnce(new ApiError(409, 'HAS_OPEN_PAID_ORDERS', 'x'))
    await expect(deleteProduct(3)).rejects.toMatchObject({ code: 'HAS_OPEN_PAID_ORDERS' })
  })

  it('getCategories lê GET /categories e guarda só id e nome', async () => {
    api.mockResolvedValue({ data: [{ id: 1, name: 'Livros e apostilas', activeListingCount: 4 }] })
    expect(await getCategories()).toEqual([{ id: 1, name: 'Livros e apostilas' }])
  })
})

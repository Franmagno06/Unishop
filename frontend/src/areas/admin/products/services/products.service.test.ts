import { beforeEach, describe, expect, it } from 'vitest'
import { resetUsersData } from '../../users/services/users.data'
import { deleteUser } from '../../users/services/users.service'
import { resetProductsData } from './products.data'
import {
  deleteProduct,
  getProductDetail,
  getProductStats,
  listProducts,
  searchSellers,
  updateProduct,
} from './products.service'

beforeEach(() => {
  resetUsersData()
  resetProductsData()
})

const all = { search: '', categoryId: null, page: 1 }
const keep = {
  title: 'Cálculo I — Guidorizzi, vol. 1',
  categoryId: 1,
  priceInCents: 4500,
  description: 'Livro em ótimo estado, 5ª edição.',
  sellerId: 2,
  whatsapp: '85991234567',
  status: 'active' as const,
}

describe('API simulada · produtos do admin', () => {
  it('lista 6 por página, os 6 primeiros são os do Figma, e fecha os 266 produtos', async () => {
    const page = await listProducts(all)
    expect(page.items.map((product) => product.title)).toEqual([
      'Cálculo I — Guidorizzi, vol. 1',
      'Calculadora HP 12C',
      'Física I — Halliday, 10ª ed.',
      'Apostila de Anatomia Humana',
      'Brownie caseiro (kit 3)',
      'Jaleco branco — tam. M',
    ])
    expect(page.total).toBe(266)
  })

  it('os indicadores batem com o Figma: 152 ativos, 18 pausados e 96 vendidos no mês', async () => {
    expect(await getProductStats()).toEqual({ active: 152, paused: 18, soldInMonth: 96 })
  })

  it('filtra por categoria e busca pelo nome do produto ou do vendedor', async () => {
    const food = await listProducts({ ...all, categoryId: 3 })
    expect(food.items.every((product) => product.categoryName === 'Alimentos')).toBe(true)
    expect((await listProducts({ ...all, search: 'larissa moura' })).items.map((p) => p.title)).toContain(
      'Brownie caseiro (kit 3)',
    )
    expect((await listProducts({ ...all, search: 'halliday' })).total).toBe(1)
  })

  it('edita dados e status; o admin reverte "Vendido" (RN-ADM-08)', async () => {
    const saved = await updateProduct(6, {
      ...keep,
      title: ' Jaleco branco ',
      sellerId: 7,
      categoryId: 4,
      priceInCents: 3000,
      status: 'active',
    })
    expect(saved).toMatchObject({ title: 'Jaleco branco', status: 'active', priceInCents: 3000 })
    expect((await getProductDetail(6))?.status).toBe('active')
  })

  it('troca o vendedor quando não há pedido aberto', async () => {
    const saved = await updateProduct(3, { ...keep, sellerId: 4, whatsapp: '85991110004' })
    expect(saved.seller.name).toBe('Carla Mendes')
  })

  it('com pedido aberto, trocar o vendedor é recusado; os outros campos mudam (RN-ADM-08)', async () => {
    await expect(updateProduct(2, { ...keep, sellerId: 3 })).rejects.toMatchObject({
      status: 409,
      code: 'HAS_OPEN_ORDERS',
    })
    await expect(updateProduct(2, { ...keep, sellerId: 1, title: 'Calculadora HP 12C Gold' })).resolves.toBeTruthy()
  })

  it('a imagem nova vira a capa', async () => {
    const saved = await updateProduct(4, { ...keep, sellerId: 4, imageUrl: 'blob:nova' })
    expect(saved.images[0]!.url).toBe('blob:nova')
  })

  it('excluir com pedido pago em aberto é recusado; sem pedido, remove o anúncio (RN-ADM-09)', async () => {
    await expect(deleteProduct(1)).rejects.toMatchObject({ status: 409, code: 'HAS_OPEN_PAID_ORDERS' })
    await deleteProduct(4)
    expect(await getProductDetail(4)).toBeNull()
    expect((await listProducts(all)).total).toBe(265)
  })

  it('os produtos de um usuário excluído saem do painel', async () => {
    await deleteUser(7)
    expect(await getProductDetail(6)).toBeNull()
  })

  it('a busca de vendedores devolve no máximo 8 contas ativas', async () => {
    expect((await searchSellers('')).length).toBe(8)
    expect((await searchSellers('bruno.sales')).map((seller) => seller.name)).toEqual(['Bruno Sales'])
  })
})

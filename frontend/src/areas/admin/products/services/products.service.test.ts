import { beforeEach, describe, expect, it } from 'vitest'
import { resetUsersData } from '../../users/services/users.data'
import { deleteUser } from '../../users/services/users.service'
import { resetProductsData } from './products.data'
import {
  deleteProduct,
  getProductDetail,
  getProductStats,
  listProducts,
  updateProduct,
} from './products.service'

beforeEach(() => {
  resetUsersData()
  resetProductsData()
})

const all = { search: '', categoryId: null, page: 1 }

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

  it('o admin altera só o status; reverte "Vendido" e pausa o ativo (RN-ADM-08)', async () => {
    expect((await updateProduct(6, { status: 'active' })).status).toBe('active')
    expect((await getProductDetail(6))?.status).toBe('active')
    const paused = await updateProduct(1, { status: 'paused' })
    expect(paused.status).toBe('paused')
    // O resto do anúncio não muda.
    expect(paused).toMatchObject({ title: 'Cálculo I — Guidorizzi, vol. 1', priceInCents: 4500 })
    expect(paused.seller.name).toBe('Ana Lima')
  })

  it('produto que não existe é recusado com 404', async () => {
    await expect(updateProduct(99999, { status: 'paused' })).rejects.toMatchObject({ status: 404 })
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
})

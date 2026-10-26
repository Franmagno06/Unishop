import { beforeEach, describe, expect, it } from 'vitest'
import { resetProductsData } from '../../products/services/products.data'
import { resetUsersData } from './users.data'
import {
  deleteUser,
  getUserDetail,
  getUserStats,
  listUsers,
  updateUser,
} from './users.service'

beforeEach(() => {
  resetUsersData()
  resetProductsData()
})

const all = { search: '', presence: 'all' as const, page: 1 }

describe('API simulada · usuários do admin', () => {
  it('lista 7 por página, os 7 primeiros são os do Figma, e conta 1.412 alunos', async () => {
    const page = await listUsers(all)
    expect(page.items.map((user) => user.name)).toEqual([
      'Francisco Magno',
      'Ana Lima',
      'Bruno Sales',
      'Carla Mendes',
      'João Pereira',
      'Larissa Moura',
      'Pedro Alves',
    ])
    expect(page.total).toBe(1412)
    expect(page.totalPages).toBe(202)
    expect(page.items[0]!.isOnline).toBe(true)
    expect(page.items[3]!.isOnline).toBe(false)
  })

  it('os indicadores contam só alunos e "logados agora" só de contas ativas (RN-ADM-02)', async () => {
    const stats = await getUserStats()
    expect(stats.total).toBe(1412)
    expect(stats.online).toBeGreaterThan(60)
    expect(stats.newThisWeek).toBeGreaterThan(10)
    expect(stats.newThisWeek).toBeLessThan(80)
  })

  it('busca por nome ou e-mail sem diferenciar maiúsculas nem acentos', async () => {
    expect((await listUsers({ ...all, search: 'JOAO pereira' })).items.map((u) => u.name)).toEqual(['João Pereira'])
    expect((await listUsers({ ...all, search: 'larissa.moura@' })).total).toBe(1)
  })

  it('filtra por "logados agora" e "offline"', async () => {
    const online = await listUsers({ ...all, presence: 'online' })
    const offline = await listUsers({ ...all, presence: 'offline' })
    expect(online.items.every((user) => user.isOnline)).toBe(true)
    expect(offline.items.every((user) => !user.isOnline)).toBe(true)
    expect(online.total + offline.total).toBe(1412)
  })

  it('uma página além da última devolve a última', async () => {
    const page = await listUsers({ ...all, page: 9999 })
    expect(page.page).toBe(202)
  })

  it('o detalhe traz os anúncios e os indicadores; id que não existe é null', async () => {
    const detail = await getUserDetail(2)
    expect(detail?.user.name).toBe('Ana Lima')
    expect(detail?.listings.map((listing) => listing.title)).toContain('Cálculo I — Guidorizzi, vol. 1')
    expect(detail?.stats.listings).toBe(detail?.listings.length)
    expect(await getUserDetail(99999)).toBeNull()
  })

  it('o admin altera só o status da conta; suspensa não conta como logada (RN-ADM-05)', async () => {
    const saved = await updateUser(1, { status: 'suspended' })
    expect(saved.status).toBe('suspended')
    expect(saved.isOnline).toBe(false)
    expect(saved.email).toBe('franmagno06@edu.unifor.br')
    expect((await getUserDetail(1))?.user.status).toBe('suspended')
    expect((await updateUser(1, { status: 'active' })).status).toBe('active')
  })

  it('excluir com pedido pago em aberto é recusado e nada muda (RN-ADM-06)', async () => {
    await expect(deleteUser(2)).rejects.toMatchObject({ status: 409, code: 'HAS_OPEN_PAID_ORDERS' })
    expect((await getUserStats()).total).toBe(1412)
  })

  it('excluir anonimiza: sai da lista e dos indicadores, e não se exclui duas vezes', async () => {
    await deleteUser(7)
    expect(await getUserDetail(7)).toBeNull()
    expect((await getUserStats()).total).toBe(1411)
    expect((await listUsers({ ...all, search: 'pedro alves' })).total).toBe(0)
    await expect(deleteUser(7)).rejects.toMatchObject({ status: 404 })
  })
})

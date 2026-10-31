import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildDbApp } from '../helpers/db-app'
import { createListing, createOrder, createUser, resetDb, testDb } from '../helpers/db'

// Área admin de usuários (RN-ADM-02 a 05, 10, 12), com o banco real.
const { app, auth } = buildDbApp()

let admin: Awaited<ReturnType<typeof createUser>>

beforeEach(async () => {
  await resetDb()
  admin = await createUser({ name: 'Admin Um', role: 'admin' })
})

const MIN = 60_000
const DAY = 24 * 60 * MIN
const ago = (ms: number) => new Date(Date.now() - ms)
const adminAuth = () => auth({ id: admin.id, role: 'admin' })
const get = (path: string, query: object = {}) =>
  request(app).get(`/api/v1/admin/users${path}`).query(query).set(adminAuth())

describe('GET /admin/users/stats', () => {
  it('RN-ADM-02: estatísticas contam só alunos não excluídos', async () => {
    await createUser()
    await createUser({ accountStatus: 'suspensa' })
    await createUser({ accountStatus: 'excluida' })
    const res = await get('/stats')
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(2) // admin e excluído ficam de fora
  })

  it('RN-ADM-02: logados agora conta só contas ativas', async () => {
    await createUser({ lastSeen: ago(2 * MIN) })
    await createUser({ accountStatus: 'suspensa', lastSeen: ago(1 * MIN) })
    await createUser({ lastSeen: ago(6 * MIN) })
    expect((await get('/stats')).body.data.online).toBe(1)
  })

  it('RN-ADM-02: novos na semana = cadastro nos últimos 7 dias', async () => {
    await createUser({ createdAt: ago(2 * DAY) })
    await createUser({ createdAt: ago(8 * DAY) })
    await createUser({ createdAt: ago(1 * DAY), accountStatus: 'excluida' })
    expect((await get('/stats')).body.data.newThisWeek).toBe(1)
  })
})

describe('GET /admin/users', () => {
  it('RN-ADM-02: lista só alunos ativos e suspensos, com status e quantidade de anúncios não excluídos', async () => {
    const ana = await createUser({ name: 'Ana' })
    const bia = await createUser({ name: 'Bia', accountStatus: 'suspensa' })
    await createUser({ name: 'Excluida', accountStatus: 'excluida' })
    await createListing(ana.id)
    await createListing(ana.id)
    await createListing(ana.id, { deletedAt: new Date() })
    const res = await get('')
    expect(res.status).toBe(200)
    const byName = Object.fromEntries((res.body.data as { name: string }[]).map((u) => [u.name, u]))
    expect(Object.keys(byName).sort()).toEqual(['Ana', 'Bia'])
    expect(byName.Ana).toMatchObject({
      id: ana.id,
      status: 'active',
      role: 'student',
      listingsCount: 2,
    })
    expect(byName.Bia).toMatchObject({ id: bia.id, status: 'suspended', listingsCount: 0 })
  })

  it('RN-ADM-02: busca por nome ou e-mail, sem diferenciar maiúsculas; % e _ são texto comum', async () => {
    await createUser({ name: 'Maria Silva', email: 'maria@edu.unifor.br' })
    await createUser({ name: 'João', email: 'joao.silva@edu.unifor.br' })
    await createUser({ name: 'Pedro', email: 'pedro@edu.unifor.br' })
    const names = async (search: string) =>
      ((await get('', { search })).body.data as { name: string }[]).map((u) => u.name).sort()
    expect(await names('SILVA')).toEqual(['João', 'Maria Silva'])
    expect(await names('pedro@edu')).toEqual(['Pedro'])
    expect(await names('%')).toEqual([])
    expect(await names('_')).toEqual([])
  })

  it('RN-ADM-02: pagina com meta { page, limit, total, totalPages }', async () => {
    for (let i = 0; i < 3; i++) await createUser({ createdAt: ago((i + 1) * DAY) })
    const res = await get('', { page: 2, limit: 2 })
    expect(res.body.data).toHaveLength(1)
    expect(res.body.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 })
  })

  it('RN-ADM-03: isOnline aparece na lista e no detalhe', async () => {
    const on = await createUser({ lastSeen: ago(1 * MIN) })
    const off = await createUser({ lastSeen: ago(30 * MIN) })
    const list = (await get('')).body.data as { id: number; isOnline: boolean }[]
    expect(list.find((u) => u.id === on.id)?.isOnline).toBe(true)
    expect(list.find((u) => u.id === off.id)?.isOnline).toBe(false)
    expect((await get(`/${on.id}`)).body.data.user.isOnline).toBe(true)
  })
})

describe('GET /admin/users/:id', () => {
  it('RN-ADM-04: detalhe mostra os dados só para consulta, com anúncios e indicadores; nunca hash de senha nem google_sub', async () => {
    const seller = await createUser({ name: 'Vendedora', googleSub: 'sub-secreto' })
    const buyer = await createUser()
    const l1 = await createListing(seller.id, { name: 'Livro' })
    await createListing(seller.id, { deletedAt: new Date() })
    await testDb.listingImage.create({
      data: { listingId: l1.id, position: 1, url: 'http://x/a.png', publicId: 'a' },
    })
    await createOrder(l1.id, buyer.id, seller.id, { status: 'concluido' })
    await createOrder(l1.id, buyer.id, seller.id, { status: 'cancelado' })
    const res = await get(`/${seller.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.user).toMatchObject({
      id: seller.id,
      name: 'Vendedora',
      email: seller.email,
      whatsapp: '85999990000',
      role: 'student',
      status: 'active',
    })
    expect(res.body.data.listings).toHaveLength(1)
    expect(res.body.data.listings[0]).toMatchObject({
      id: l1.id,
      title: 'Livro',
      priceInCents: 1000,
      categoryName: 'Livros e apostilas',
      status: 'active',
      imageUrl: 'http://x/a.png',
    })
    expect(res.body.data.stats).toEqual({ listings: 1, sales: 1, purchases: 0 })
    const raw = JSON.stringify(res.body)
    expect(raw).not.toContain('hash-de-teste')
    expect(raw).not.toContain('sub-secreto')
    expect(raw).not.toMatch(/passwordHash|googleSub/)
  })

  it('RN-ADM-04: detalhe de conta excluída ou inexistente dá 404, e id inválido dá 400', async () => {
    const gone = await createUser({ accountStatus: 'excluida' })
    expect((await get(`/${gone.id}`)).status).toBe(404)
    expect((await get('/99999')).status).toBe(404)
    expect((await get('/abc')).status).toBe(400)
  })
})

import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildDbApp } from '../helpers/db-app'
import { hashPassword } from '../../src/shared/utils/hash'
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

describe('PATCH /admin/users/:id', () => {
  const patch = (id: number, body: object, as = adminAuth()) =>
    request(app).patch(`/api/v1/admin/users/${id}`).send(body).set(as)
  const accountStatusOf = async (id: number) =>
    (await testDb.user.findUniqueOrThrow({ where: { id } })).accountStatus

  it('RN-ADM-05: suspender barra o login (403 ACCOUNT_SUSPENDED)', async () => {
    const user = await createUser({ passwordHash: await hashPassword('Senha123') })
    expect((await patch(user.id, { status: 'suspended' })).status).toBe(200)
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'Senha123' })
    expect(login.status).toBe(403)
    expect(login.body.error.code).toBe('ACCOUNT_SUSPENDED')
  })

  it('RN-ADM-05: suspender barra o token já emitido (403 ACCOUNT_SUSPENDED)', async () => {
    const user = await createUser()
    await patch(user.id, { status: 'suspended' })
    const res = await request(app)
      .get('/api/v1/users/me')
      .set(auth({ id: user.id }))
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED')
  })

  it('RN-ADM-05: suspender oculta os anúncios sem mudar status nem apagar', async () => {
    const seller = await createUser()
    const viewer = await createUser()
    const listing = await createListing(seller.id)
    const ids = async () => {
      const res = await request(app)
        .get('/api/v1/listings')
        .set(auth({ id: viewer.id }))
      return (res.body.data as { id: number }[]).map((l) => l.id)
    }
    expect(await ids()).toContain(listing.id)
    await patch(seller.id, { status: 'suspended' })
    expect(await ids()).not.toContain(listing.id)
    const row = await testDb.listing.findUniqueOrThrow({ where: { id: listing.id } })
    expect(row.status).toBe('ativo')
    expect(row.deletedAt).toBeNull()
  })

  it('RN-ADM-05: reativar devolve os anúncios à vitrine e libera o login', async () => {
    const seller = await createUser({ passwordHash: await hashPassword('Senha123') })
    const viewer = await createUser()
    const listing = await createListing(seller.id)
    await patch(seller.id, { status: 'suspended' })
    const res = await patch(seller.id, { status: 'active' })
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ id: seller.id, status: 'active' })
    const list = await request(app)
      .get('/api/v1/listings')
      .set(auth({ id: viewer.id }))
    expect((list.body.data as { id: number }[]).map((l) => l.id)).toContain(listing.id)
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: seller.email, password: 'Senha123' })
    expect(login.status).toBe(200)
  })

  it('RN-ADM-10: suspender e reativar gravam log com responsável, ação e detalhes', async () => {
    const user = await createUser()
    await patch(user.id, { status: 'suspended' })
    await patch(user.id, { status: 'active' })
    const logs = await testDb.auditLog.findMany({ orderBy: { id: 'asc' } })
    expect(logs.map((l) => l.action)).toEqual(['suspender_usuario', 'reativar_usuario'])
    expect(logs[0]).toMatchObject({ adminId: admin.id, entity: 'usuario', entityId: user.id })
    expect(logs[0]?.details).toEqual({ status: { from: 'active', to: 'suspended' } })
    expect(logs[1]?.details).toEqual({ status: { from: 'suspended', to: 'active' } })
  })

  it('RN-ADM-10: se o log falha, a suspensão é desfeita', async () => {
    const failing = buildDbApp({
      writeAuditLog: async () => {
        throw new Error('falha simulada')
      },
    })
    const user = await createUser()
    const res = await request(failing.app)
      .patch(`/api/v1/admin/users/${user.id}`)
      .send({ status: 'suspended' })
      .set(failing.auth({ id: admin.id, role: 'admin' }))
    expect(res.status).toBe(500)
    expect(res.body.error.code).toBe('INTERNAL_ERROR')
    expect(await accountStatusOf(user.id)).toBe('ativa')
    expect(await testDb.auditLog.count()).toBe(0)
  })

  it('RN-ADM-04: PATCH com nome, e-mail ou WhatsApp dá 400 e nada muda', async () => {
    const user = await createUser({ name: 'Original' })
    for (const body of [
      { name: 'Outro' },
      { email: 'x@edu.unifor.br' },
      { whatsapp: '85911112222' },
      { status: 'suspended', name: 'Outro' },
    ]) {
      const res = await patch(user.id, body)
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    }
    const row = await testDb.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(row).toMatchObject({ name: 'Original', accountStatus: 'ativa' })
  })

  it('RN-ADM-04: status excluida ou valor desconhecido dá 400', async () => {
    const user = await createUser()
    for (const status of ['deleted', 'excluida', 'banido']) {
      expect((await patch(user.id, { status })).status).toBe(400)
    }
  })

  it('RN-ADM-12: admin não suspende a si mesmo (409 ADMIN_PROTECTED) e nada é gravado', async () => {
    await createUser({ role: 'admin' }) // outro admin ativo: a barreira é "a si mesmo"
    const res = await patch(admin.id, { status: 'suspended' })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('ADMIN_PROTECTED')
    expect(await accountStatusOf(admin.id)).toBe('ativa')
    expect(await testDb.auditLog.count()).toBe(0)
  })

  it('RN-ADM-12: dois admins suspendendo um ao outro ao mesmo tempo: sobra um admin ativo', async () => {
    const other = await createUser({ role: 'admin' })
    const [a, b] = await Promise.all([
      patch(other.id, { status: 'suspended' }, auth({ id: admin.id, role: 'admin' })),
      patch(admin.id, { status: 'suspended' }, auth({ id: other.id, role: 'admin' })),
    ])
    // O perdedor já foi suspenso pelo vencedor quando entra na trava: é recusado como autor suspenso.
    expect([a.status, b.status].sort()).toEqual([200, 403])
    const failed = a.status === 403 ? a : b
    expect(failed.body.error.code).toBe('ACCOUNT_SUSPENDED')
    expect(await testDb.user.count({ where: { role: 'admin', accountStatus: 'ativa' } })).toBe(1)
  })

  it('RN-ADM-12: autor suspenso depois de gerar o token é recusado; o alvo não muda e não há log', async () => {
    const author = await createUser({ role: 'admin' })
    const target = await createUser()
    const headers = auth({ id: author.id, role: 'admin' }) // token gerado antes da suspensão
    await testDb.user.update({ where: { id: author.id }, data: { accountStatus: 'suspensa' } })
    const res = await patch(target.id, { status: 'suspended' }, headers)
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED')
    expect(await accountStatusOf(target.id)).toBe('ativa')
    expect(await testDb.auditLog.count()).toBe(0)
  })

  it('RN-ADM-12: admin suspende outro admin quando sobra um ativo', async () => {
    const other = await createUser({ role: 'admin' })
    expect((await patch(other.id, { status: 'suspended' })).status).toBe(200)
  })

  it('PATCH em conta inexistente ou excluída dá 404', async () => {
    const gone = await createUser({ accountStatus: 'excluida' })
    expect((await patch(gone.id, { status: 'suspended' })).status).toBe(404)
    expect((await patch(99999, { status: 'suspended' })).status).toBe(404)
  })

  it('PATCH com o mesmo status dá 409 INVALID_STATE e não grava log (Q5)', async () => {
    const user = await createUser()
    const res = await patch(user.id, { status: 'active' })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('INVALID_STATE')
    expect(await testDb.auditLog.count()).toBe(0)
  })
})

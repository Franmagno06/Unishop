import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildDbApp } from '../helpers/db-app'
import { createListing, createOrder, createUser, resetDb, testDb } from '../helpers/db'

// DELETE /admin/users/:id (RN-ADM-06, 10, 12) com o banco real.
const { app, auth } = buildDbApp()

let admin: Awaited<ReturnType<typeof createUser>>

beforeEach(async () => {
  await resetDb()
  admin = await createUser({ name: 'Admin Um', role: 'admin' })
})

const adminAuth = () => auth({ id: admin.id, role: 'admin' })
const del = (id: number, as = adminAuth()) =>
  request(app).delete(`/api/v1/admin/users/${id}`).set(as)
const userRow = (id: number) => testDb.user.findUniqueOrThrow({ where: { id } })
const orderStatus = async (id: number) =>
  (await testDb.order.findUniqueOrThrow({ where: { id } })).status

describe('DELETE /admin/users/:id', () => {
  it('RN-ADM-06: anonimiza nome, e-mail, senha, google_sub, WhatsApp, curso e foto; conta vira excluida', async () => {
    const user = await createUser({
      name: 'Maria Real',
      googleSub: 'sub-1',
      course: 'Direito',
      photoUrl: 'http://x/foto.png',
      lastSeen: new Date(),
    })
    expect((await del(user.id)).status).toBe(204)
    const row = await userRow(user.id)
    expect(row).toMatchObject({
      name: 'Usuário removido',
      email: `removido_${user.id}@removido.invalid`,
      passwordHash: null,
      googleSub: null,
      whatsapp: null,
      course: null,
      photoUrl: null,
      accountStatus: 'excluida',
    })
  })

  it('Decisão 1: apaga ultimo_acesso e mantém aceite dos Termos e demais campos de controle', async () => {
    const accepted = new Date('2026-09-01T10:00:00.000Z')
    const user = await createUser({ lastSeen: new Date(), termsAcceptedAt: accepted })
    await del(user.id)
    const row = await userRow(user.id)
    expect(row.lastSeen).toBeNull()
    expect(row.termsAcceptedAt?.toISOString()).toBe(accepted.toISOString())
    expect(row.createdAt.getTime()).toBe(user.createdAt.getTime())
  })

  it('Decisão 1: o WhatsApp dos anúncios do usuário vira texto vazio', async () => {
    const user = await createUser()
    const listing = await createListing(user.id, { whatsapp: '85988887777' })
    await del(user.id)
    const row = await testDb.listing.findUniqueOrThrow({ where: { id: listing.id } })
    expect(row.whatsapp).toBe('')
  })

  it('RN-ADM-06: o e-mail original fica livre para um novo cadastro', async () => {
    const user = await createUser({ email: 'livre@edu.unifor.br' })
    await del(user.id)
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Nova Pessoa',
      email: 'livre@edu.unifor.br',
      password: 'Senha123',
      passwordConfirmation: 'Senha123',
      acceptTerms: true,
    })
    expect(res.status).toBe(201)
  })

  it('RN-ADM-06: os anúncios do usuário saem do ar (excluido_em) e somem da vitrine', async () => {
    const user = await createUser()
    const viewer = await createUser()
    const listing = await createListing(user.id)
    await del(user.id)
    const row = await testDb.listing.findUniqueOrThrow({ where: { id: listing.id } })
    expect(row.deletedAt).not.toBeNull()
    const list = await request(app)
      .get('/api/v1/listings')
      .set(auth({ id: viewer.id }))
    expect(list.body.data).toHaveLength(0)
  })

  it('RN-ADM-06: pedidos Pendente e Em negociação, como comprador e como vendedor, são cancelados', async () => {
    const user = await createUser()
    const other = await createUser()
    const mine = await createListing(user.id)
    const theirs = await createListing(other.id)
    const asSeller = await createOrder(mine.id, other.id, user.id, { status: 'em_negociacao' })
    const asBuyer = await createOrder(theirs.id, user.id, other.id, {
      status: 'pendente',
      negotiationType: 'pagamento_site',
    })
    expect((await del(user.id)).status).toBe(204)
    expect(await orderStatus(asSeller.id)).toBe('cancelado')
    expect(await orderStatus(asBuyer.id)).toBe('cancelado')
  })

  it('RN-ADM-06: bloqueada com pedido Pago em aberto como comprador (409 HAS_OPEN_PAID_ORDERS) e nada muda', async () => {
    const user = await createUser({ name: 'Compradora' })
    const other = await createUser()
    const theirs = await createListing(other.id)
    const mine = await createListing(user.id)
    const pago = await createOrder(theirs.id, user.id, other.id, {
      status: 'pago',
      negotiationType: 'pagamento_site',
    })
    const pending = await createOrder(mine.id, other.id, user.id, { status: 'pendente' })
    const res = await del(user.id)
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('HAS_OPEN_PAID_ORDERS')
    expect((await userRow(user.id)).accountStatus).toBe('ativa')
    expect((await userRow(user.id)).name).toBe('Compradora')
    expect(await orderStatus(pago.id)).toBe('pago')
    expect(await orderStatus(pending.id)).toBe('pendente')
    expect(
      (await testDb.listing.findUniqueOrThrow({ where: { id: mine.id } })).deletedAt,
    ).toBeNull()
    expect(await testDb.auditLog.count()).toBe(0)
  })

  it('RN-ADM-06: bloqueada com pedido em Retirada combinada como vendedor (409) e nada muda', async () => {
    const user = await createUser()
    const buyer = await createUser()
    const mine = await createListing(user.id)
    const order = await createOrder(mine.id, buyer.id, user.id, {
      status: 'retirada_combinada',
      negotiationType: 'pagamento_site',
    })
    const res = await del(user.id)
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('HAS_OPEN_PAID_ORDERS')
    expect((await userRow(user.id)).accountStatus).toBe('ativa')
    expect(await orderStatus(order.id)).toBe('retirada_combinada')
  })

  it("RN-ADM-06: pedidos concluídos permanecem e mostram 'Usuário removido' para a outra parte", async () => {
    const user = await createUser({ name: 'Vai Sair' })
    const other = await createUser()
    const theirs = await createListing(other.id)
    const done = await createOrder(theirs.id, user.id, other.id, { status: 'concluido' })
    await del(user.id)
    const order = await testDb.order.findUniqueOrThrow({
      where: { id: done.id },
      include: { buyer: true },
    })
    expect(order.status).toBe('concluido')
    expect(order.buyer.name).toBe('Usuário removido')
  })

  it('RN-ADM-06: tokens pendentes são apagados e o token de sessão antigo recebe 401', async () => {
    const user = await createUser()
    await testDb.userToken.create({
      data: {
        userId: user.id,
        type: 'redefinicao_senha',
        tokenHash: 'hash-qualquer',
        expiresAt: new Date(Date.now() + 60_000),
      },
    })
    await del(user.id)
    expect(await testDb.userToken.count({ where: { userId: user.id } })).toBe(0)
    const res = await request(app)
      .get('/api/v1/users/me')
      .set(auth({ id: user.id }))
    expect(res.status).toBe(401)
  })

  it('RN-ADM-10: exclusão grava log delete_user só com ids e contagens', async () => {
    const user = await createUser({ name: 'Nome Secreto' })
    const buyer = await createUser()
    const listing = await createListing(user.id)
    await createListing(user.id)
    const order = await createOrder(listing.id, buyer.id, user.id, { status: 'em_negociacao' })
    await del(user.id)
    const log = await testDb.auditLog.findFirstOrThrow()
    expect(log).toMatchObject({
      adminId: admin.id,
      action: 'excluir_usuario',
      entity: 'usuario',
      entityId: user.id,
    })
    expect(log.details).toEqual({ cancelledOrderIds: [order.id], deletedListings: 2 })
    expect(JSON.stringify(log.details)).not.toContain('Nome Secreto')
  })

  it('RN-ADM-10: se o log falha, a anonimização é desfeita', async () => {
    const failing = buildDbApp({
      writeAuditLog: async () => {
        throw new Error('falha simulada')
      },
    })
    const user = await createUser({ name: 'Intacta' })
    const listing = await createListing(user.id)
    const buyer = await createUser()
    const order = await createOrder(listing.id, buyer.id, user.id, { status: 'em_negociacao' })
    const res = await request(failing.app)
      .delete(`/api/v1/admin/users/${user.id}`)
      .set(failing.auth({ id: admin.id, role: 'admin' }))
    expect(res.status).toBe(500)
    expect(await userRow(user.id)).toMatchObject({ name: 'Intacta', accountStatus: 'ativa' })
    expect(
      (await testDb.listing.findUniqueOrThrow({ where: { id: listing.id } })).deletedAt,
    ).toBeNull()
    expect(await orderStatus(order.id)).toBe('em_negociacao')
  })

  it('RN-ADM-12: admin não exclui a si mesmo (409 ADMIN_PROTECTED)', async () => {
    await createUser({ role: 'admin' })
    const res = await del(admin.id)
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('ADMIN_PROTECTED')
    expect((await userRow(admin.id)).accountStatus).toBe('ativa')
  })

  it('RN-ADM-12: autor suspenso depois de gerar o token é recusado (403) e nada é excluído', async () => {
    const author = await createUser({ role: 'admin' })
    const target = await createUser()
    const headers = auth({ id: author.id, role: 'admin' })
    await testDb.user.update({ where: { id: author.id }, data: { accountStatus: 'suspensa' } })
    const res = await del(target.id, headers)
    expect(res.status).toBe(403)
    expect((await userRow(target.id)).accountStatus).toBe('ativa')
    expect(await testDb.auditLog.count()).toBe(0)
  })

  it('RN-ADM-12: admin exclui outro admin quando sobra um ativo', async () => {
    const other = await createUser({ role: 'admin' })
    expect((await del(other.id)).status).toBe(204)
  })

  it('DELETE de conta inexistente ou já excluída dá 404; id inválido dá 400', async () => {
    const gone = await createUser({ accountStatus: 'excluida' })
    expect((await del(gone.id)).status).toBe(404)
    expect((await del(99999)).status).toBe(404)
    expect((await del('abc' as unknown as number)).status).toBe(400)
  })
})

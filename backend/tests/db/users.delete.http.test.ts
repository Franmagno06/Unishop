import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildDbApp } from '../helpers/db-app'
import { createListing, createOrder, createUser, resetDb, testDb } from '../helpers/db'

// DELETE /users/me com o banco real (RN-PER-06): mesma anonimização do admin.
const { app, auth } = buildDbApp()

beforeEach(resetDb)

const delMe = (id: number, role?: 'admin') =>
  request(app)
    .delete('/api/v1/users/me')
    .set(auth({ id, ...(role && { role }) }))
    .send({ confirmation: 'EXCLUIR' })
const orderStatus = async (id: number) =>
  (await testDb.order.findUniqueOrThrow({ where: { id } })).status

describe('DELETE /users/me (banco real)', () => {
  it('RN-PER-06: excluir o próprio perfil usa a mesma anonimização (anúncios fora do ar, pedidos abertos cancelados)', async () => {
    const me = await createUser({ name: 'Eu Mesma', lastSeen: new Date() })
    const buyer = await createUser()
    const listing = await createListing(me.id)
    const order = await createOrder(listing.id, buyer.id, me.id, { status: 'em_negociacao' })

    expect((await delMe(me.id)).status).toBe(204)
    const row = await testDb.user.findUniqueOrThrow({ where: { id: me.id } })
    expect(row).toMatchObject({
      name: 'Usuário removido',
      email: `removido_${me.id}@removido.invalid`,
      accountStatus: 'excluida',
      lastSeen: null,
    })
    expect(
      (await testDb.listing.findUniqueOrThrow({ where: { id: listing.id } })).deletedAt,
    ).not.toBeNull()
    expect(await orderStatus(order.id)).toBe('cancelado')
  })

  it('RN-PER-06: bloqueada com pedido Pago como comprador (409 HAS_OPEN_PAID_ORDERS)', async () => {
    const me = await createUser()
    const seller = await createUser()
    const listing = await createListing(seller.id)
    await createOrder(listing.id, me.id, seller.id, {
      status: 'pago',
      negotiationType: 'pagamento_site',
    })
    const res = await delMe(me.id)
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('HAS_OPEN_PAID_ORDERS')
    expect((await testDb.user.findUniqueOrThrow({ where: { id: me.id } })).accountStatus).toBe(
      'ativa',
    )
  })

  it('RN-PER-06: bloqueada com pedido em Retirada combinada como vendedor (409)', async () => {
    const me = await createUser()
    const buyer = await createUser()
    const listing = await createListing(me.id)
    await createOrder(listing.id, buyer.id, me.id, {
      status: 'retirada_combinada',
      negotiationType: 'pagamento_site',
    })
    const res = await delMe(me.id)
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('HAS_OPEN_PAID_ORDERS')
  })

  it('RN-PER-06: não grava log de auditoria', async () => {
    const me = await createUser()
    await delMe(me.id)
    expect(await testDb.auditLog.count()).toBe(0)
  })

  it('Q7: admin continua recusado em DELETE /users/me, sem mudar o status', async () => {
    const adm = await createUser({ role: 'admin' })
    const res = await delMe(adm.id, 'admin')
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('ADMIN_PROTECTED')
    expect((await testDb.user.findUniqueOrThrow({ where: { id: adm.id } })).accountStatus).toBe(
      'ativa',
    )
  })
})

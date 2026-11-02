import { createAdminListingsService } from '../../src/admin/listings/admin-listings.service'
import { createPrismaAdminListingsRepository } from '../../src/admin/listings/admin-listings.repository'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushBackground } from '../../src/shared/utils/background'
import { buildDbApp } from '../helpers/db-app'
import { createFakeMail } from '../helpers/fakes'
import { createListing, createOrder, createUser, resetDb, testDb } from '../helpers/db'

// DELETE /admin/listings/:id (RN-ADM-09, 10, RN-NOT-02) com o banco real.
let admin: Awaited<ReturnType<typeof createUser>>
let seller: Awaited<ReturnType<typeof createUser>>

beforeEach(async () => {
  await resetDb()
  ctx = buildDbApp() // e-mails falsos zerados a cada teste
  admin = await createUser({ name: 'Admin Um', role: 'admin' })
  seller = await createUser({ name: 'Ana Vendedora', email: 'ana.v@edu.unifor.br' })
})

afterEach(async () => {
  vi.restoreAllMocks()
  await flushBackground() // o e-mail roda em segundo plano
})

let ctx = buildDbApp()
const del = (id: number, c = ctx) =>
  request(c.app)
    .delete(`/api/v1/admin/listings/${id}`)
    .set(c.auth({ id: admin.id, role: 'admin' }))
const rowOf = (id: number) => testDb.listing.findUniqueOrThrow({ where: { id } })
const orderStatus = async (id: number) =>
  (await testDb.order.findUniqueOrThrow({ where: { id } })).status

describe('DELETE /admin/listings/:id', () => {
  it('RN-ADM-09: exclusão lógica; o produto some da vitrine e as imagens ficam', async () => {
    const viewer = await createUser()
    const l = await createListing(seller.id)
    await testDb.listingImage.create({
      data: { listingId: l.id, position: 1, url: 'http://x/a.png', publicId: 'a' },
    })
    const res = await del(l.id)
    expect(res.status).toBe(204)
    expect((await rowOf(l.id)).deletedAt).not.toBeNull()
    expect(await testDb.listingImage.count({ where: { listingId: l.id } })).toBe(1)
    const list = await request(ctx.app)
      .get('/api/v1/listings')
      .set(ctx.auth({ id: viewer.id }))
    expect(list.body.data).toHaveLength(0)
  })

  it('RN-ADM-09: cancela os pedidos Pendente e Em negociação do produto', async () => {
    const l = await createListing(seller.id)
    const b1 = await createUser()
    const b2 = await createUser()
    const p = await createOrder(l.id, b1.id, seller.id, {
      status: 'pendente',
      negotiationType: 'pagamento_site',
    })
    const n = await createOrder(l.id, b2.id, seller.id, { status: 'em_negociacao' })
    expect((await del(l.id)).status).toBe(204)
    expect(await orderStatus(p.id)).toBe('cancelado')
    expect(await orderStatus(n.id)).toBe('cancelado')
  })

  it.each(['pago', 'retirada_combinada'])(
    'RN-ADM-09: bloqueada com pedido %s (409 HAS_OPEN_PAID_ORDERS); nada muda e nenhum e-mail sai',
    async (status) => {
      const l = await createListing(seller.id)
      const buyer = await createUser()
      const other = await createUser()
      const paid = await createOrder(l.id, buyer.id, seller.id, {
        status,
        negotiationType: 'pagamento_site',
      })
      const pending = await createOrder(l.id, other.id, seller.id, { status: 'pendente' })
      const res = await del(l.id)
      expect(res.status).toBe(409)
      expect(res.body.error.code).toBe('HAS_OPEN_PAID_ORDERS')
      expect((await rowOf(l.id)).deletedAt).toBeNull()
      expect(await orderStatus(paid.id)).toBe(status)
      expect(await orderStatus(pending.id)).toBe('pendente')
      expect(ctx.mail.listingRemoved).toHaveLength(0)
      expect(await testDb.auditLog.count()).toBe(0)
    },
  )

  it('RN-ANU-09: pedidos concluídos continuam no histórico do comprador', async () => {
    const l = await createListing(seller.id)
    const buyer = await createUser()
    const done = await createOrder(l.id, buyer.id, seller.id, { status: 'concluido' })
    await del(l.id)
    expect(await orderStatus(done.id)).toBe('concluido')
  })

  it('RN-NOT-02: o vendedor recebe o e-mail de exclusão com o nome do produto', async () => {
    const c = buildDbApp()
    const l = await createListing(seller.id, { name: 'Calculadora Científica' })
    expect((await del(l.id, c)).status).toBe(204)
    await flushBackground()
    expect(c.mail.listingRemoved).toEqual([
      { to: 'ana.v@edu.unifor.br', name: 'Ana Vendedora', listingTitle: 'Calculadora Científica' },
    ])
  })

  it('RN-NOT-02: falha no e-mail não desfaz a exclusão', async () => {
    const mail = createFakeMail()
    const c = buildDbApp({
      mail: {
        ...mail.provider,
        sendListingRemoved: async () => {
          throw new Error('smtp fora do ar')
        },
      },
    })
    const l = await createListing(seller.id)
    const res = await del(l.id, c)
    expect(res.status).toBe(204)
    expect((await rowOf(l.id)).deletedAt).not.toBeNull()
    expect(await testDb.auditLog.count()).toBe(1)
  })

  it('RN-NOT-02: e-mail que falha não vaza e-mail nem nome no log de aplicação', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const mail = createFakeMail()
    const c = buildDbApp({
      mail: {
        ...mail.provider,
        sendListingRemoved: async ({ to }) => {
          throw new Error('falha para ' + to)
        },
      },
    })
    const l = await createListing(seller.id, { name: 'Calculadora Científica' })
    expect((await del(l.id, c)).status).toBe(204)
    await flushBackground()
    const logged = JSON.stringify(spy.mock.calls)
    expect(logged).toContain(String(l.id))
    expect(logged).not.toContain('ana.v@edu.unifor.br')
    expect(logged).not.toContain('Ana Vendedora')
    expect(logged).not.toContain('Calculadora')
  })

  it('RN-NOT-02: a resposta não espera o e-mail (provider que nunca resolve)', async () => {
    let release: () => void = () => undefined
    const hang = new Promise<void>((resolve) => (release = resolve))
    const mail = createFakeMail()
    const c = buildDbApp({ mail: { ...mail.provider, sendListingRemoved: () => hang } })
    const l = await createListing(seller.id)
    const res = await del(l.id, c)
    expect(res.status).toBe(204)
    release() // solta a tarefa para o afterEach não travar
  })

  it('RN-NOT-02: exclusão bloqueada (409) ou produto inexistente (404) não envia e-mail', async () => {
    const l = await createListing(seller.id)
    const buyer = await createUser()
    await createOrder(l.id, buyer.id, seller.id, {
      status: 'pago',
      negotiationType: 'pagamento_site',
    })
    expect((await del(l.id)).status).toBe(409)
    expect((await del(99999)).status).toBe(404)
    await flushBackground()
    expect(ctx.mail.listingRemoved).toHaveLength(0)
  })

  it('RN-ADM-10: exclusão grava log delete_listing só com ids e contagens', async () => {
    const l = await createListing(seller.id, { name: 'Título Secreto' })
    const buyer = await createUser()
    const order = await createOrder(l.id, buyer.id, seller.id, { status: 'em_negociacao' })
    await del(l.id)
    const log = await testDb.auditLog.findFirstOrThrow()
    expect(log).toMatchObject({
      adminId: admin.id,
      action: 'excluir_anuncio',
      entity: 'anuncio',
      entityId: l.id,
    })
    expect(log.details).toEqual({ cancelledOrderIds: [order.id] })
    expect(JSON.stringify(log.details)).not.toContain('Título Secreto')
  })

  it('RN-ADM-10: se o log falha, nada é excluído e nenhum e-mail sai', async () => {
    const c = buildDbApp({
      writeAuditLog: async () => {
        throw new Error('falha simulada')
      },
    })
    const l = await createListing(seller.id)
    const buyer = await createUser()
    const order = await createOrder(l.id, buyer.id, seller.id, { status: 'em_negociacao' })
    const res = await del(l.id, c)
    expect(res.status).toBe(500)
    expect((await rowOf(l.id)).deletedAt).toBeNull()
    expect(await orderStatus(order.id)).toBe('em_negociacao')
    expect(c.mail.listingRemoved).toHaveLength(0)
  })

  it('RN-ADM-12: autor suspenso depois do authenticate é recusado na transação (403) e nada é excluído', async () => {
    const author = await createUser({ role: 'admin', accountStatus: 'suspensa' })
    const l = await createListing(seller.id)
    const service = createAdminListingsService({
      listings: createPrismaAdminListingsRepository(testDb),
      mail: ctx.mail.provider,
    })
    await expect(service.remove(author.id, l.id)).rejects.toMatchObject({
      status: 403,
      code: 'ACCOUNT_SUSPENDED',
    })
    expect((await rowOf(l.id)).deletedAt).toBeNull()
    expect(await testDb.auditLog.count()).toBe(0)
    expect(ctx.mail.listingRemoved).toHaveLength(0)
  })

  it('DELETE de produto já excluído ou inexistente dá 404; id inválido dá 400', async () => {
    const gone = await createListing(seller.id, { deletedAt: new Date() })
    expect((await del(gone.id)).status).toBe(404)
    expect((await del(99999)).status).toBe(404)
    expect((await del('abc' as unknown as number)).status).toBe(400)
  })
})

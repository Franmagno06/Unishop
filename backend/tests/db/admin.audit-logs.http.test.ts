import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { writeAuditLog } from '../../src/admin/audit-logs/audit-logs.repository'
import type { AuditEntry } from '../../src/admin/audit-logs/audit-logs.types'
import { buildDbApp } from '../helpers/db-app'
import { createUser, resetDb, testDb } from '../helpers/db'

// Auditoria do admin (RN-ADM-10), com o banco real.
const { app, auth } = buildDbApp()

let admin: Awaited<ReturnType<typeof createUser>>
let other: Awaited<ReturnType<typeof createUser>>
let student: Awaited<ReturnType<typeof createUser>>

beforeEach(async () => {
  await resetDb()
  admin = await createUser({ name: 'Admin Um', role: 'admin' })
  other = await createUser({ name: 'Admin Dois', role: 'admin' })
  student = await createUser()
})

const entry = (over: Partial<AuditEntry> = {}): AuditEntry => ({
  adminId: admin.id,
  action: 'suspend_user',
  entity: 'user',
  entityId: student.id,
  details: { status: { from: 'active', to: 'suspended' } },
  ...over,
})
const write = (e: AuditEntry) => testDb.$transaction((tx) => writeAuditLog(tx, e))
const get = (
  query: object = {},
  user: { id: number; role?: 'admin' } = { id: admin.id, role: 'admin' },
) => request(app).get('/api/v1/admin/audit-logs').query(query).set(auth(user))

describe('writeAuditLog', () => {
  it('RN-ADM-10: grava responsável, ação, alvo e data na transação recebida', async () => {
    await write(entry())
    const row = await testDb.auditLog.findFirstOrThrow()
    expect(row.adminId).toBe(admin.id)
    expect(row.action).toBe('suspender_usuario')
    expect(row.entity).toBe('usuario')
    expect(row.entityId).toBe(student.id)
    expect(row.details).toEqual({ status: { from: 'active', to: 'suspended' } })
    expect(Date.now() - row.createdAt.getTime()).toBeLessThan(60_000)
  })

  it('RN-ADM-10: se a transação falha depois do writeAuditLog, o log não fica gravado', async () => {
    await expect(
      testDb.$transaction(async (tx) => {
        await writeAuditLog(tx, entry())
        throw new Error('falha depois do log')
      }),
    ).rejects.toThrow('falha depois do log')
    expect(await testDb.auditLog.count()).toBe(0)
  })
})

describe('GET /admin/audit-logs', () => {
  it('RN-ADM-10: lista do mais recente ao mais antigo, com o nome do admin', async () => {
    await write(entry({ entityId: 1 }))
    await write(
      entry({ adminId: other.id, action: 'delete_listing', entity: 'listing', entityId: 2 }),
    )
    const res = await get()
    expect(res.status).toBe(200)
    expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 })
    expect(res.body.data).toHaveLength(2)
    expect(res.body.data[0]).toMatchObject({
      admin: { id: other.id, name: 'Admin Dois' },
      action: 'delete_listing',
      target: { type: 'listing', id: 2 },
    })
    expect(res.body.data[1]).toMatchObject({
      admin: { id: admin.id, name: 'Admin Um' },
      action: 'suspend_user',
      target: { type: 'user', id: 1 },
      changes: { status: { from: 'active', to: 'suspended' } },
    })
    expect(typeof res.body.data[0].at).toBe('string')
  })

  it('RN-ADM-10: filtra por responsável, por ação e por período', async () => {
    await write(entry())
    await write(entry({ adminId: other.id, action: 'reactivate_user' }))
    await testDb.auditLog.updateMany({
      where: { adminId: other.id },
      data: { createdAt: new Date('2026-01-10T12:00:00Z') },
    })

    expect((await get({ adminId: other.id })).body.data).toHaveLength(1)
    const byAction = await get({ action: 'suspend_user' })
    expect(byAction.body.data).toHaveLength(1)
    expect(byAction.body.data[0].admin.id).toBe(admin.id)
    const byPeriod = await get({ from: '2026-01-01T00:00:00Z', to: '2026-02-01T00:00:00Z' })
    expect(byPeriod.body.data).toHaveLength(1)
    expect(byPeriod.body.data[0].action).toBe('reactivate_user')
  })

  it('período invertido, ação desconhecida ou página inválida dão 400 VALIDATION_ERROR', async () => {
    for (const q of [
      { from: '2026-02-01T00:00:00Z', to: '2026-01-01T00:00:00Z' },
      { action: 'apagar_tudo' },
      { page: 0 },
    ]) {
      const res = await get(q)
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    }
  })

  it('RN-ADM-01: aluno recebe 403 e visitante 401', async () => {
    expect((await get({}, { id: student.id })).status).toBe(403)
    expect((await request(app).get('/api/v1/admin/audit-logs')).status).toBe(401)
  })
})

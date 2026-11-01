import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { hashToken } from '../../src/shared/utils/hash'
import { buildDbApp } from '../helpers/db-app'
import { createUser, resetDb, testDb } from '../helpers/db'

// Troca de e-mail confirmada no novo endereço (RN-PER-02, RF013.4) com o banco real: uso único,
// concorrência e o índice único em lower(email).
const { app, auth, mail } = buildDbApp()

beforeEach(async () => {
  await resetDb()
  mail.emailChanges.length = 0
})

type Who = { id: number; role?: 'student' | 'admin' }
const requestChange = (who: Who, email: string) =>
  request(app).post('/api/v1/users/me/email-change').set(auth(who)).send({ email })
const confirm = (who: Who, token: string) =>
  request(app).post('/api/v1/users/me/email-change/confirm').set(auth(who)).send({ token })
const tokenOf = (index: number) =>
  /\/confirmar-troca-email\/([0-9a-f]+)$/.exec(mail.emailChanges[index]!.link)![1]!
const emailOf = async (id: number) => (await testDb.user.findUniqueOrThrow({ where: { id } })).email

describe('troca de e-mail (banco real)', () => {
  it('fluxo feliz: grava só o hash, troca o e-mail e marca como verificado', async () => {
    const ana = await createUser({ email: 'ana@edu.unifor.br', verified: false })
    expect((await requestChange(ana, 'ana.nova@edu.unifor.br')).status).toBe(202)
    const token = tokenOf(0)
    const row = await testDb.userToken.findFirstOrThrow({ where: { userId: ana.id } })
    expect(row).toMatchObject({
      type: 'troca_email',
      newEmail: 'ana.nova@edu.unifor.br',
      tokenHash: hashToken(token),
    })
    expect(await emailOf(ana.id)).toBe('ana@edu.unifor.br')

    const res = await confirm(ana, token)
    expect(res.status).toBe(200)
    expect(res.body.data.user.email).toBe('ana.nova@edu.unifor.br')
    const user = await testDb.user.findUniqueOrThrow({ where: { id: ana.id } })
    expect(user.verified).toBe(true)
    expect(
      (await testDb.userToken.findUniqueOrThrow({ where: { id: row.id } })).usedAt,
    ).not.toBeNull()
  })

  it('D6: o administrador também troca o e-mail', async () => {
    const admin = await createUser({ role: 'admin', email: 'admin@edu.unifor.br' })
    const who = { id: admin.id, role: 'admin' as const }
    expect((await requestChange(who, 'admin.novo@edu.unifor.br')).status).toBe(202)
    expect((await confirm(who, tokenOf(0))).status).toBe(200)
    expect(await emailOf(admin.id)).toBe('admin.novo@edu.unifor.br')
  })

  it('12: dois confirm simultâneos com o mesmo token: um 200 e um 400', async () => {
    const ana = await createUser()
    await requestChange(ana, 'ana.nova@edu.unifor.br')
    const token = tokenOf(0)
    const results = await Promise.all([confirm(ana, token), confirm(ana, token)])
    expect(results.map((r) => r.status).sort()).toEqual([200, 400])
    expect(await emailOf(ana.id)).toBe('ana.nova@edu.unifor.br')
  })

  it('13: dois usuários com o mesmo endereço novo, confirmando juntos: um 200 e um 409', async () => {
    const ana = await createUser()
    const bia = await createUser()
    await requestChange(ana, 'disputado@edu.unifor.br')
    await requestChange(bia, 'disputado@edu.unifor.br')
    const results = await Promise.all([confirm(ana, tokenOf(0)), confirm(bia, tokenOf(1))])
    expect(results.map((r) => r.status).sort()).toEqual([200, 409])
    expect(await testDb.user.count({ where: { email: 'disputado@edu.unifor.br' } })).toBe(1)
  })

  it('14: endereço tomado antes da confirmação dá 409 e o token não é consumido', async () => {
    const ana = await createUser()
    await requestChange(ana, 'cobicado@edu.unifor.br')
    await createUser({ email: 'Cobicado@edu.unifor.br' }) // terceiro se cadastrou antes
    const res = await confirm(ana, tokenOf(0))
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('EMAIL_ALREADY_REGISTERED')
    const row = await testDb.userToken.findFirstOrThrow({ where: { userId: ana.id } })
    expect(row.usedAt).toBeNull() // a transação foi desfeita
    expect((await emailOf(ana.id)).endsWith('@edu.unifor.br')).toBe(true)
    expect(await emailOf(ana.id)).not.toBe('cobicado@edu.unifor.br')
  })

  it('15: a anonimização entre o pedido e a confirmação apaga o token; o confirm dá 401', async () => {
    const ana = await createUser()
    await requestChange(ana, 'ana.nova@edu.unifor.br')
    const token = tokenOf(0)
    const del = await request(app)
      .delete('/api/v1/users/me')
      .set(auth(ana))
      .send({ confirmation: 'EXCLUIR' })
    expect(del.status).toBe(204)
    expect(await testDb.userToken.count({ where: { userId: ana.id } })).toBe(0)
    expect((await confirm(ana, token)).status).toBe(401)
  })

  it('16: cleanup-expired-tokens remove os troca_email vencidos e mantém os válidos', async () => {
    const ana = await createUser()
    await testDb.userToken.createMany({
      data: [
        {
          userId: ana.id,
          type: 'troca_email',
          tokenHash: 'vencido',
          newEmail: 'a@edu.unifor.br',
          expiresAt: new Date(Date.now() - 1000),
        },
        {
          userId: ana.id,
          type: 'troca_email',
          tokenHash: 'valido',
          newEmail: 'b@edu.unifor.br',
          expiresAt: new Date(Date.now() + 60_000),
        },
      ],
    })
    const res = await request(app)
      .get('/api/v1/internal/jobs/cleanup-expired-tokens')
      .set('Authorization', `Bearer ${process.env.CRON_SECRET!}`)
    expect(res.body.data).toEqual({ deleted: 1 })
    expect((await testDb.userToken.findFirstOrThrow()).tokenHash).toBe('valido')
  })

  it('confirmar a troca invalida os demais links pendentes (redefinição de senha no e-mail antigo)', async () => {
    const ana = await createUser({ email: 'ana@edu.unifor.br' })
    mail.sent.length = 0
    await request(app).post('/api/v1/auth/forgot-password').send({ email: 'ana@edu.unifor.br' })
    const resetToken = /token=([0-9a-f]+)$/.exec(mail.sent[0]!.link)![1]!
    await requestChange(ana, 'ana.nova@edu.unifor.br')
    expect((await confirm(ana, tokenOf(0))).status).toBe(200)
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, password: 'NovaSenha123', passwordConfirmation: 'NovaSenha123' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('TOKEN_INVALID')
  })

  it('o segundo pedido consome os pendentes: só o último token funciona', async () => {
    const ana = await createUser()
    await requestChange(ana, 'um@edu.unifor.br')
    await requestChange(ana, 'dois@edu.unifor.br')
    expect((await confirm(ana, tokenOf(0))).status).toBe(400)
    expect((await confirm(ana, tokenOf(1))).status).toBe(200)
    expect(await emailOf(ana.id)).toBe('dois@edu.unifor.br')
  })
})

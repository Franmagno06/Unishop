import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildDbApp } from '../helpers/db-app'
import { createUser, resetDb, testDb } from '../helpers/db'

// Foto de perfil (RN-PER-05): JPG ou PNG de até 4 MB, com o banco real.
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')
const { app, auth, storage } = buildDbApp()

let user: Awaited<ReturnType<typeof createUser>>

beforeEach(async () => {
  await resetDb()
  user = await createUser()
  storage.uploaded.length = 0
})

const put = (file: Buffer, filename = 'foto.png', who = user) =>
  request(app)
    .put('/api/v1/users/me/avatar')
    .set(auth(who))
    .attach('image', file, { filename, contentType: 'image/png' })

describe('PUT /users/me/avatar', () => {
  it('RN-PER-05: grava a foto no perfil e devolve o perfil atualizado', async () => {
    const res = await put(PNG)
    expect(res.status).toBe(200)
    expect(res.body.data.user.avatarUrl).toBe(storage.uploaded[0]?.url)
    expect((await testDb.user.findUniqueOrThrow({ where: { id: user.id } })).photoUrl).toBe(
      storage.uploaded[0]?.url,
    )
    const me = await request(app).get('/api/v1/users/me').set(auth(user))
    expect(me.body.data.user.avatarUrl).toBe(storage.uploaded[0]?.url)
  })

  it('RN-PER-05: o admin também troca a própria foto', async () => {
    const admin = await createUser({ role: 'admin' })
    const res = await request(app)
      .put('/api/v1/users/me/avatar')
      .set(auth({ id: admin.id, role: 'admin' }))
      .attach('image', PNG, { filename: 'a.png', contentType: 'image/png' })
    expect(res.status).toBe(200)
  })

  it('RN-PER-05: arquivo que não é JPG/PNG dá 415 e a foto não muda', async () => {
    const res = await put(Buffer.from('%PDF-1.4 não sou imagem'))
    expect(res.status).toBe(415)
    expect(res.body.error.code).toBe('FILE_TYPE_NOT_ALLOWED')
    expect((await testDb.user.findUniqueOrThrow({ where: { id: user.id } })).photoUrl).toBeNull()
    expect(storage.uploaded).toHaveLength(0)
  })

  it('RN-PER-05: imagem acima de 4 MB dá 413', async () => {
    const res = await put(Buffer.concat([PNG, Buffer.alloc(4 * 1024 * 1024)]))
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('FILE_TOO_LARGE')
  })

  it('sem imagem dá 400 e visitante recebe 401', async () => {
    expect((await request(app).put('/api/v1/users/me/avatar').set(auth(user))).status).toBe(400)
    expect(
      (await request(app).put('/api/v1/users/me/avatar').attach('image', PNG, 'a.png')).status,
    ).toBe(401)
  })
})

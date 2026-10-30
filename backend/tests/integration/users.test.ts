import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app'
import { hashPassword } from '../../src/shared/utils/hash'
import {
  createFakeMail,
  createFakeOAuth,
  createFakeProfiles,
  createFakeTokens,
  createFakeUsers,
} from '../helpers/fakes'

const PASSWORD = 'Senha123'
const ana = {
  name: 'Ana Souza',
  email: 'ana@edu.unifor.br',
  password: PASSWORD,
  passwordConfirmation: PASSWORD,
  acceptTerms: true,
}
const bruno = { ...ana, name: 'Bruno Lima', email: 'bruno@edu.unifor.br' }

let users: ReturnType<typeof createFakeUsers>
let profiles: ReturnType<typeof createFakeProfiles>
let app: ReturnType<typeof createApp>

beforeEach(() => {
  users = createFakeUsers()
  profiles = createFakeProfiles(users.rows)
  app = createApp({
    users: users.repo,
    profiles: profiles.repo,
    tokens: createFakeTokens().repo,
    mail: createFakeMail().provider,
    oauth: createFakeOAuth().provider,
  })
})

const api = () => request(app)

// Cadastra, entra e devolve o cabeçalho de autenticação.
async function signIn(user = ana) {
  await api().post('/api/v1/auth/register').send(user)
  const res = await api().post('/api/v1/auth/login').send({ email: user.email, password: PASSWORD })
  return { Authorization: `Bearer ${res.body.data.token as string}` }
}

const get = (auth: object) => api().get('/api/v1/users/me').set(auth)
const patch = (auth: object, body: object) => api().patch('/api/v1/users/me').set(auth).send(body)
const remove = (auth: object, body: object = { confirmation: 'EXCLUIR' }) =>
  api().delete('/api/v1/users/me').set(auth).send(body)

describe('GET /users/me', () => {
  it('RF012.1: devolve o perfil do próprio usuário, sem senha nem hash', async () => {
    const res = await get(await signIn())
    expect(res.status).toBe(200)
    expect(res.body.data.user).toEqual({
      id: 1,
      name: 'Ana Souza',
      email: 'ana@edu.unifor.br',
      course: null,
      whatsapp: null,
      avatarUrl: null,
      role: 'student',
    })
    expect(JSON.stringify(res.body)).not.toMatch(/hash|Senha123/)
  })

  it('RF012.1: sem login dá 401', async () => {
    expect((await api().get('/api/v1/users/me')).status).toBe(401)
  })
})

describe('PATCH /users/me', () => {
  it('RN-PER-01: altera nome, curso e WhatsApp e devolve o perfil novo', async () => {
    const auth = await signIn()
    const res = await patch(auth, {
      name: 'Ana Souza Lima',
      course: 'Ciência da Computação',
      whatsapp: '85991234567',
    })
    expect(res.status).toBe(200)
    expect(res.body.data.user).toMatchObject({
      name: 'Ana Souza Lima',
      course: 'Ciência da Computação',
      whatsapp: '85991234567',
    })
    expect((await get(auth)).body.data.user.name).toBe('Ana Souza Lima')
  })

  it.each([
    ['curto demais', 'Ab'],
    ['longo demais', 'A'.repeat(151)],
  ])('RN-PER-01: nome %s dá 400 VALIDATION_ERROR', async (_nome, name) => {
    const res = await patch(await signIn(), { name })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('RN-PER-01: curso com mais de 100 caracteres dá 400', async () => {
    expect((await patch(await signIn(), { course: 'x'.repeat(101) })).status).toBe(400)
  })

  it('RN-PER-07: WhatsApp com máscara é guardado só com dígitos', async () => {
    const res = await patch(await signIn(), { whatsapp: '(85) 9 9123-4567' })
    expect(res.body.data.user.whatsapp).toBe('85991234567')
    expect(users.rows[0]?.whatsapp).toBe('85991234567')
  })

  it.each([
    ['9 dígitos', '859912345'],
    ['12 dígitos', '859912345678'],
    ['letras', 'abc'],
  ])('RN-PER-07: WhatsApp com %s dá 400', async (_nome, whatsapp) => {
    expect((await patch(await signIn(), { whatsapp })).status).toBe(400)
  })

  it('RN-PER-01: curso e WhatsApp vazios limpam os campos; campo ausente não mexe', async () => {
    const auth = await signIn()
    await patch(auth, { course: 'Direito', whatsapp: '85991234567' })
    await patch(auth, { name: 'Ana S.' })
    expect(users.rows[0]).toMatchObject({ course: 'Direito', whatsapp: '85991234567' })

    await patch(auth, { course: '', whatsapp: '' })
    expect(users.rows[0]).toMatchObject({ course: null, whatsapp: null })
  })

  it('RN-PER-03: o WhatsApp novo vai para os anúncios ativos; pausados e vendidos não mudam', async () => {
    const auth = await signIn()
    await patch(auth, { whatsapp: '85990000000' })
    profiles.listings.push(
      { id: 1, userId: 1, status: 'ativo', whatsapp: '85990000000' },
      { id: 2, userId: 1, status: 'pausado', whatsapp: '85990000000' },
      { id: 3, userId: 1, status: 'vendido', whatsapp: '85990000000' },
      { id: 4, userId: 99, status: 'ativo', whatsapp: '85988888888' }, // de outro aluno
    )

    await patch(auth, { whatsapp: '85991234567' })
    expect(profiles.listings.map((l) => l.whatsapp)).toEqual([
      '85991234567',
      '85990000000',
      '85990000000',
      '85988888888',
    ])
  })

  it('RN-ADM-11: ignora role e id enviados no corpo', async () => {
    const auth = await signIn()
    const res = await patch(auth, { name: 'Ana Souza', role: 'admin', id: 99 })
    expect(res.status).toBe(200)
    expect(users.rows[0]).toMatchObject({ id: 1, role: 'student' })
  })

  it('só altera o próprio perfil: o dono vem do token, nunca do corpo', async () => {
    const authAna = await signIn()
    await signIn(bruno)
    await patch(authAna, { name: 'Ana Nova', userId: 2 })
    expect(users.rows.map((u) => u.name)).toEqual(['Ana Nova', 'Bruno Lima'])
  })

  it('sem login dá 401', async () => {
    expect((await api().patch('/api/v1/users/me').send({ name: 'Ana' })).status).toBe(401)
  })
})

describe('PATCH /users/me: troca de e-mail direta', () => {
  it('troca o e-mail no banco e o login passa a ser pelo novo', async () => {
    const auth = await signIn()
    const res = await patch(auth, { email: 'Ana.Nova@edu.unifor.br' })
    expect(res.status).toBe(200)
    expect(res.body.data.user.email).toBe('ana.nova@edu.unifor.br')
    expect(users.rows[0]?.email).toBe('ana.nova@edu.unifor.br')

    const login = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'ana.nova@edu.unifor.br', password: PASSWORD })
    expect(login.status).toBe(200)
  })

  it('RN-ACE-02: e-mail fora de @edu.unifor.br dá 403 e não troca nada', async () => {
    const res = await patch(await signIn(), { email: 'ana@gmail.com' })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('EMAIL_DOMAIN_NOT_ALLOWED')
    expect(users.rows[0]?.email).toBe('ana@edu.unifor.br')
  })

  it('RN-ACE-03: e-mail de outra conta, mesmo com maiúsculas, dá 409', async () => {
    const auth = await signIn()
    await signIn(bruno)
    const res = await patch(auth, { email: 'BRUNO@edu.unifor.br' })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('EMAIL_ALREADY_REGISTERED')
    expect(users.rows[0]?.email).toBe('ana@edu.unifor.br')
  })

  it('mandar o próprio e-mail (a tela envia todos os campos) não é erro', async () => {
    const res = await patch(await signIn(), { name: 'Ana S.', email: 'ANA@edu.unifor.br' })
    expect(res.status).toBe(200)
    expect(users.rows[0]).toMatchObject({ name: 'Ana S.', email: 'ana@edu.unifor.br' })
  })

  it('e-mail inválido dá 400', async () => {
    expect((await patch(await signIn(), { email: 'nao-e-email' })).status).toBe(400)
  })
})

describe('DELETE /users/me', () => {
  it('RN-PER-06: anonimiza a conta (sem dado pessoal) e devolve 204', async () => {
    const auth = await signIn()
    await patch(auth, { course: 'Direito', whatsapp: '85991234567' })
    const res = await remove(auth)

    expect(res.status).toBe(204)
    expect(users.rows[0]).toMatchObject({
      name: 'Usuário removido',
      email: 'removido_1@removido.invalid',
      passwordHash: null,
      googleSub: null,
      whatsapp: null,
      course: null,
      status: 'deleted',
    })
  })

  it('RN-PER-06: a conta excluída não entra mais, nem com o token antigo', async () => {
    const auth = await signIn()
    await remove(auth)

    expect((await get(auth)).status).toBe(401)
    const login = await api()
      .post('/api/v1/auth/login')
      .send({ email: ana.email, password: PASSWORD })
    expect(login.status).toBe(401)
  })

  it('RN-PER-06: o e-mail antigo fica livre para um novo cadastro', async () => {
    await remove(await signIn())
    const again = await api().post('/api/v1/auth/register').send(ana)
    expect(again.status).toBe(201)
  })

  it('RN-PER-06: sem "EXCLUIR" digitado (ausente ou diferente) dá 400 e nada é apagado', async () => {
    const auth = await signIn()
    expect((await remove(auth, {})).status).toBe(400)
    expect((await remove(auth, { confirmation: 'excluir' })).status).toBe(400)
    expect(users.rows[0]?.status).toBe('active')
  })

  it('RN-ADM-12: o administrador não exclui a própria conta (403 ADMIN_PROTECTED)', async () => {
    const auth = await signIn()
    users.rows[0]!.role = 'admin'
    users.rows[0]!.passwordHash = await hashPassword(PASSWORD)
    const res = await remove(auth)
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('ADMIN_PROTECTED')
    expect(users.rows[0]?.status).toBe('active')
  })

  it('sem login dá 401', async () => {
    expect((await api().delete('/api/v1/users/me').send({ confirmation: 'EXCLUIR' })).status).toBe(
      401,
    )
  })
})

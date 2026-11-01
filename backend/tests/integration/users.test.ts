import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app'
import { hashPassword, hashToken } from '../../src/shared/utils/hash'
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
let tokens: ReturnType<typeof createFakeTokens>
let mail: ReturnType<typeof createFakeMail>
let clock: Date

beforeEach(() => {
  users = createFakeUsers()
  tokens = createFakeTokens()
  mail = createFakeMail()
  clock = new Date('2026-11-01T12:00:00Z')
  profiles = createFakeProfiles(users.rows, tokens.rows)
  app = createApp({
    users: users.repo,
    profiles: profiles.repo,
    tokens: tokens.repo,
    mail: mail.provider,
    oauth: createFakeOAuth().provider,
    now: () => clock,
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

describe('PATCH /users/me: e-mail não troca aqui (RN-PER-02, D2)', () => {
  it('e-mail igual ao atual (mesmo com maiúsculas) é aceito e ignorado', async () => {
    const res = await patch(await signIn(), { name: 'Ana S.', email: 'ANA@edu.unifor.br' })
    expect(res.status).toBe(200)
    expect(users.rows[0]).toMatchObject({ name: 'Ana S.', email: 'ana@edu.unifor.br' })
  })

  it('e-mail diferente dá 400 VALIDATION_ERROR e não troca nada', async () => {
    const res = await patch(await signIn(), { email: 'ana.nova@edu.unifor.br' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(users.rows[0]?.email).toBe('ana@edu.unifor.br')
  })

  it('e-mail inválido dá 400', async () => {
    expect((await patch(await signIn(), { email: 'nao-e-email' })).status).toBe(400)
  })
})

const NEW_EMAIL = 'ana.nova@edu.unifor.br'
const requestChange = (auth: object, email: string) =>
  api().post('/api/v1/users/me/email-change').set(auth).send({ email })
const confirmChange = (auth: object, token: string) =>
  api().post('/api/v1/users/me/email-change/confirm').set(auth).send({ token })
// O token em claro só existe no link enviado ao novo endereço.
const tokenFromMail = (index = mail.emailChanges.length - 1) =>
  /\/confirmar-troca-email\/([0-9a-f]+)$/.exec(mail.emailChanges[index]!.link)![1]!

describe('POST /users/me/email-change (RN-PER-02, RF013.4)', () => {
  it('202: o link vai só ao NOVO endereço; o token em claro não é guardado', async () => {
    const res = await requestChange(await signIn(), NEW_EMAIL)
    expect(res.status).toBe(202)
    expect(res.body.data).toEqual({ pendingEmail: NEW_EMAIL, expiresInMinutes: 30 })
    expect(mail.emailChanges).toHaveLength(1)
    expect(mail.emailChanges[0]).toMatchObject({ to: NEW_EMAIL, expiresInMinutes: 30 })
    expect(mail.emailChanges[0]!.link).toMatch(
      /^http:\/\/localhost:5173\/confirmar-troca-email\/[0-9a-f]{64}$/,
    )
    const token = tokenFromMail()
    expect(tokens.rows).toHaveLength(1)
    expect(tokens.rows[0]).toMatchObject({
      type: 'troca_email',
      newEmail: NEW_EMAIL,
      tokenHash: hashToken(token),
    })
    expect(JSON.stringify(tokens.rows)).not.toContain(token)
    expect(tokens.rows[0]!.expiresAt).toEqual(new Date(clock.getTime() + 30 * 60_000))
    expect(users.rows[0]?.email).toBe('ana@edu.unifor.br') // ainda não trocou
    expect(mail.sent).toHaveLength(0)
  })

  it('RN-ACE-02: domínio fora de @edu.unifor.br dá 403, sem token nem e-mail', async () => {
    const res = await requestChange(await signIn(), 'ana@gmail.com')
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('EMAIL_DOMAIN_NOT_ALLOWED')
    expect(tokens.rows).toHaveLength(0)
    expect(mail.emailChanges).toHaveLength(0)
  })

  it('e-mail igual ao atual (inclusive com maiúsculas) dá 400, sem token nem e-mail', async () => {
    const res = await requestChange(await signIn(), 'ANA@edu.unifor.br')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(tokens.rows).toHaveLength(0)
    expect(mail.emailChanges).toHaveLength(0)
  })

  it('RN-ACE-03: e-mail de outra conta (maiúsculas) dá 409, sem token nem e-mail', async () => {
    const auth = await signIn()
    await signIn(bruno)
    const res = await requestChange(auth, 'BRUNO@edu.unifor.br')
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('EMAIL_ALREADY_REGISTERED')
    expect(tokens.rows).toHaveLength(0)
    expect(mail.emailChanges).toHaveLength(0)
  })

  it('um segundo pedido invalida o primeiro', async () => {
    const auth = await signIn()
    await requestChange(auth, NEW_EMAIL)
    const first = tokenFromMail(0)
    await requestChange(auth, 'ana.outra@edu.unifor.br')
    const res = await confirmChange(auth, first)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('TOKEN_INVALID')
    expect((await confirmChange(auth, tokenFromMail(1))).status).toBe(200)
  })

  it('falha no envio dá 502 EXTERNAL_SERVICE_ERROR, sem expor o motivo', async () => {
    mail.provider.sendEmailChange = async () => {
      throw new Error('smtp caiu em smtp.interno:25')
    }
    const res = await requestChange(await signIn(), NEW_EMAIL)
    expect(res.status).toBe(502)
    expect(res.body.error.code).toBe('EXTERNAL_SERVICE_ERROR')
    expect(JSON.stringify(res.body)).not.toContain('smtp')
  })

  it('sem sessão dá 401; conta suspensa dá 403; e-mail inválido dá 400', async () => {
    expect(
      (await api().post('/api/v1/users/me/email-change').send({ email: NEW_EMAIL })).status,
    ).toBe(401)
    const auth = await signIn()
    expect((await requestChange(auth, 'nao-e-email')).status).toBe(400)
    users.rows[0]!.status = 'suspended'
    const res = await requestChange(auth, NEW_EMAIL)
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED')
  })
})

describe('POST /users/me/email-change/confirm (RN-PER-02, RF013.4)', () => {
  it('200: o e-mail muda, o login vale só com o novo e a sessão antiga continua (D5)', async () => {
    const auth = await signIn()
    await requestChange(auth, NEW_EMAIL)
    const res = await confirmChange(auth, tokenFromMail())
    expect(res.status).toBe(200)
    expect(res.body.data.user.email).toBe(NEW_EMAIL)
    expect(users.rows[0]).toMatchObject({ email: NEW_EMAIL, verified: true })

    const ok = await api().post('/api/v1/auth/login').send({ email: NEW_EMAIL, password: PASSWORD })
    expect(ok.status).toBe(200)
    const old = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'ana@edu.unifor.br', password: PASSWORD })
    expect(old.status).toBe(401)
    expect(old.body.error.code).toBe('INVALID_CREDENTIALS')
    expect((await get(auth)).body.data.user.email).toBe(NEW_EMAIL) // o JWT antigo segue válido
  })

  it('token vencido (30 min + 1 s) dá 400 TOKEN_EXPIRED e não troca nada', async () => {
    const auth = await signIn()
    await requestChange(auth, NEW_EMAIL)
    clock = new Date(clock.getTime() + 30 * 60_000 + 1000)
    const res = await confirmChange(auth, tokenFromMail())
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('TOKEN_EXPIRED')
    expect(users.rows[0]?.email).toBe('ana@edu.unifor.br')
  })

  it('token de outro usuário dá 400 TOKEN_INVALID e não troca nada', async () => {
    const authAna = await signIn()
    const authBruno = await signIn(bruno)
    await requestChange(authAna, NEW_EMAIL)
    const res = await confirmChange(authBruno, tokenFromMail())
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('TOKEN_INVALID')
    expect(users.rows.map((u) => u.email)).toEqual(['ana@edu.unifor.br', 'bruno@edu.unifor.br'])
  })

  it('token de outro tipo (redefinição de senha) dá 400', async () => {
    const auth = await signIn()
    tokens.rows.push({
      id: 99,
      userId: 1,
      type: 'redefinicao_senha',
      tokenHash: hashToken('abc'),
      expiresAt: new Date(clock.getTime() + 60_000),
      usedAt: null,
      newEmail: null,
    })
    expect((await confirmChange(auth, 'abc')).status).toBe(400)
    expect(users.rows[0]?.email).toBe('ana@edu.unifor.br')
  })

  it('o token não vale duas vezes', async () => {
    const auth = await signIn()
    await requestChange(auth, NEW_EMAIL)
    const token = tokenFromMail()
    expect((await confirmChange(auth, token)).status).toBe(200)
    const again = await confirmChange(auth, token)
    expect(again.status).toBe(400)
    expect(again.body.error.code).toBe('TOKEN_INVALID')
  })

  it('token desconhecido dá 400; corpo sem token dá 400 VALIDATION_ERROR', async () => {
    const auth = await signIn()
    expect((await confirmChange(auth, 'nao-existe')).status).toBe(400)
    const res = await api().post('/api/v1/users/me/email-change/confirm').set(auth).send({})
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('sem sessão dá 401; conta suspensa dá 403', async () => {
    const auth = await signIn()
    expect(
      (await api().post('/api/v1/users/me/email-change/confirm').send({ token: 'x' })).status,
    ).toBe(401)
    users.rows[0]!.status = 'suspended'
    expect((await confirmChange(auth, 'x')).status).toBe(403)
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

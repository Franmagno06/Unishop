import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app'
import { hashPassword } from '../../src/shared/utils/hash'
import { createFakeMail, createFakeTokens, createFakeUsers } from '../helpers/fakes'

const PASSWORD = 'Senha123'
const valid = {
  name: 'Ana Souza',
  email: 'ana@edu.unifor.br',
  password: PASSWORD,
  passwordConfirmation: PASSWORD,
  acceptTerms: true,
}

let clock = new Date('2026-10-29T12:00:00Z')
let users: ReturnType<typeof createFakeUsers>
let tokens: ReturnType<typeof createFakeTokens>
let mail: ReturnType<typeof createFakeMail>
let app: ReturnType<typeof createApp>

beforeEach(() => {
  clock = new Date('2026-10-29T12:00:00Z')
  users = createFakeUsers()
  tokens = createFakeTokens()
  mail = createFakeMail()
  app = createApp({ users: users.repo, tokens: tokens.repo, mail: mail.provider, now: () => clock })
})

const api = () => request(app)
const register = (body: object = valid) => api().post('/api/v1/auth/register').send(body)
const login = (email = valid.email, password = PASSWORD) =>
  api().post('/api/v1/auth/login').send({ email, password })

async function loggedIn() {
  await register()
  const res = await login()
  return { token: res.body.data.token as string, id: res.body.data.user.id as number }
}

describe('POST /auth/register', () => {
  it('RN-ACE-01: cria conta de aluno e não devolve senha nem hash', async () => {
    const res = await register()
    expect(res.status).toBe(201)
    expect(res.body.data.user).toEqual({ id: 1, name: 'Ana Souza', role: 'student' })
    expect(JSON.stringify(res.body)).not.toMatch(/hash|Senha123/)
    expect(users.rows[0]?.termsAcceptedAt).toEqual(clock) // RN-ACE-06
  })

  it('RN-ACE-02: recusa e-mail fora de @edu.unifor.br (403 EMAIL_DOMAIN_NOT_ALLOWED)', async () => {
    const res = await register({ ...valid, email: 'ana@gmail.com' })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('EMAIL_DOMAIN_NOT_ALLOWED')
  })

  it('RN-ACE-03: e-mail repetido, mesmo com maiúsculas, dá 409', async () => {
    await register()
    const res = await register({ ...valid, email: 'ANA@edu.unifor.br' })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('EMAIL_ALREADY_REGISTERED')
  })

  it.each([
    ['curta', 'Ab1'],
    ['sem maiúscula', 'senha1234'],
    ['sem número', 'SenhaSenha'],
    ['longa demais', 'A1' + 'a'.repeat(71)],
  ])('RN-ACE-04: senha %s dá 400 VALIDATION_ERROR', async (_nome, password) => {
    const res = await register({ ...valid, password, passwordConfirmation: password })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.requestId).toBeTruthy()
  })

  it('RN-ACE-04: confirmação diferente da senha dá 400', async () => {
    const res = await register({ ...valid, passwordConfirmation: 'Outra123' })
    expect(res.status).toBe(400)
  })

  it('RN-ACE-06: sem aceite dos Termos dá 400', async () => {
    const res = await register({ ...valid, acceptTerms: false })
    expect(res.status).toBe(400)
    expect(users.rows).toHaveLength(0)
  })

  it('RN-ADM-11: não aceita escolher o perfil pelo corpo (sempre aluno)', async () => {
    await register({ ...valid, role: 'admin' })
    expect(users.rows[0]?.role).toBe('student')
  })
})

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await register()
  })

  it('RN-ACE-08: devolve token e usuário', async () => {
    const res = await login()
    expect(res.status).toBe(200)
    expect(res.body.data.token).toEqual(expect.any(String))
    expect(res.body.data.user).toEqual({ id: 1, name: 'Ana Souza', role: 'student' })
  })

  it('RN-ACE-08: senha errada e e-mail inexistente dão a mesma resposta genérica', async () => {
    const wrongPassword = await login(valid.email, 'Errada123')
    const unknownEmail = await login('ninguem@edu.unifor.br', PASSWORD)
    expect(wrongPassword.status).toBe(401)
    expect(unknownEmail.status).toBe(401)
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS')
    expect(unknownEmail.body.error.message).toBe(wrongPassword.body.error.message)
  })

  it('RN-ACE-09: a 5ª senha errada bloqueia por 15 min (429 ACCOUNT_LOCKED)', async () => {
    for (let i = 0; i < 5; i++) await login(valid.email, 'Errada123')
    const blocked = await login() // senha certa, mas bloqueada
    expect(blocked.status).toBe(429)
    expect(blocked.body.error.code).toBe('ACCOUNT_LOCKED')
    expect(blocked.body.error.retryAfter).toBe(15 * 60)

    clock = new Date(clock.getTime() + 15 * 60_000 + 1000)
    expect((await login()).status).toBe(200)
  })

  it('RN-ACE-09: login correto zera a contagem de erros', async () => {
    for (let i = 0; i < 4; i++) await login(valid.email, 'Errada123')
    await login()
    await login(valid.email, 'Errada123')
    expect((await login()).status).toBe(200)
  })

  it('RN-ACE-12: conta suspensa dá 403 ACCOUNT_SUSPENDED', async () => {
    users.rows[0]!.status = 'suspended'
    const res = await login()
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED')
  })

  it('RN-ACE-08: conta sem senha (Google) dá o mesmo 401 genérico', async () => {
    users.rows[0]!.passwordHash = null
    const res = await login()
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('RN-ACE-13: o admin entra pelo mesmo endpoint e o perfil vem na resposta', async () => {
    users.rows.push({
      ...users.rows[0]!,
      id: 99,
      email: 'admin@unishop.com',
      role: 'admin',
      passwordHash: await hashPassword(PASSWORD),
    })
    const res = await login('admin@unishop.com')
    expect(res.status).toBe(200)
    expect(res.body.data.user.role).toBe('admin')
  })
})

describe('GET /auth/me e authenticate', () => {
  it('RN-ACE-11: devolve o usuário do token', async () => {
    const { token } = await loggedIn()
    const res = await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.data.user.name).toBe('Ana Souza')
  })

  it.each([
    ['sem cabeçalho', undefined],
    ['Bearer undefined', 'Bearer undefined'],
    ['token adulterado', 'Bearer abc.def.ghi'],
  ])('RN-ACE-11: %s dá 401', async (_nome, header) => {
    const req = api().get('/api/v1/auth/me')
    const res = await (header ? req.set('Authorization', header) : req)
    expect(res.status).toBe(401)
  })

  it('RN-ACE-12: conta suspensa depois do login é barrada na hora', async () => {
    const { token } = await loggedIn()
    users.rows[0]!.status = 'suspended'
    const res = await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED')
  })

  it('RN-ACE-06: sem aceite dos Termos só /auth/me passa; o resto dá 403 TERMS_NOT_ACCEPTED', async () => {
    const { token } = await loggedIn()
    users.rows[0]!.termsAcceptedAt = null
    const auth = { Authorization: `Bearer ${token}` }

    const me = await api().get('/api/v1/auth/me').set(auth)
    expect(me.status).toBe(200)
    expect(me.body.data.needsTermsAcceptance).toBe(true)

    const other = await api().post('/api/v1/users/me/password').set(auth).send({})
    expect(other.status).toBe(403)
    expect(other.body.error.code).toBe('TERMS_NOT_ACCEPTED')
  })
})

describe('recuperação de senha', () => {
  const forgot = (email: string) => api().post('/api/v1/auth/forgot-password').send({ email })
  const reset = (token: string, password = 'Nova12345') =>
    api()
      .post('/api/v1/auth/reset-password')
      .send({ token, password, passwordConfirmation: password })
  const tokenFromMail = () => new URL(mail.sent.at(-1)!.link).searchParams.get('token')!

  beforeEach(async () => {
    await register()
  })

  it('RN-ACE-10: responde 202 igual exista ou não a conta; só envia e-mail se existir', async () => {
    const existing = await forgot(valid.email)
    const unknown = await forgot('ninguem@edu.unifor.br')
    expect(existing.status).toBe(202)
    expect(unknown.status).toBe(202)
    expect(existing.body).toEqual(unknown.body)
    expect(mail.sent).toHaveLength(1)
  })

  it('RN-ACE-10: guarda só o hash do token, nunca o valor do link', async () => {
    await forgot(valid.email)
    expect(tokens.rows[0]?.tokenHash).not.toBe(tokenFromMail())
  })

  it('RN-ACE-10: redefine a senha, vale uma vez só e a antiga deixa de funcionar', async () => {
    await forgot(valid.email)
    const token = tokenFromMail()

    expect((await reset(token)).status).toBe(200)
    expect((await login(valid.email, 'Nova12345')).status).toBe(200)
    expect((await login(valid.email, PASSWORD)).status).toBe(401)

    const again = await reset(token)
    expect(again.status).toBe(400)
    expect(again.body.error.code).toBe('TOKEN_INVALID')
  })

  it('RN-ACE-10: dois pedidos simultâneos com o mesmo link: só um redefine', async () => {
    await forgot(valid.email)
    const token = tokenFromMail()
    const [a, b] = await Promise.all([reset(token, 'Nova12345'), reset(token, 'Outra12345')])
    expect([a.status, b.status].sort()).toEqual([200, 400])
  })

  it('RN-ACE-10: link com mais de 30 min dá 400 TOKEN_EXPIRED', async () => {
    await forgot(valid.email)
    const token = tokenFromMail()
    clock = new Date(clock.getTime() + 31 * 60_000)
    const res = await reset(token)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('TOKEN_EXPIRED')
  })

  it('RN-ACE-10: pedir um link novo invalida o anterior', async () => {
    await forgot(valid.email)
    const first = tokenFromMail()
    await forgot(valid.email)
    expect((await reset(first)).body.error.code).toBe('TOKEN_INVALID')
  })

  it('RN-ACE-10: token desconhecido dá 400 TOKEN_INVALID', async () => {
    expect((await reset('nao-existe')).body.error.code).toBe('TOKEN_INVALID')
  })

  it('RN-ACE-04: a nova senha segue a regra do cadastro', async () => {
    await forgot(valid.email)
    expect((await reset(tokenFromMail(), 'fraca')).status).toBe(400)
  })

  it('RN-ACE-10: redefinir zera o bloqueio de login', async () => {
    for (let i = 0; i < 5; i++) await login(valid.email, 'Errada123')
    await forgot(valid.email)
    await reset(tokenFromMail())
    expect((await login(valid.email, 'Nova12345')).status).toBe(200)
  })
})

describe('POST /users/me/password', () => {
  const change = (token: string, body: object) =>
    api().post('/api/v1/users/me/password').set('Authorization', `Bearer ${token}`).send(body)
  const body = { currentPassword: PASSWORD, newPassword: 'Nova12345', confirmation: 'Nova12345' }

  it('RN-ACE-15: troca a senha e devolve token novo; o antigo deixa de valer', async () => {
    const { token } = await loggedIn()
    clock = new Date(clock.getTime() + 5000) // o token novo nasce depois da troca
    const res = await change(token, body)

    expect(res.status).toBe(200)
    expect(res.body.data.token).toEqual(expect.any(String))
    expect((await login(valid.email, 'Nova12345')).status).toBe(200)
  })

  it('RN-ACE-15: token emitido antes da troca de senha dá 401 TOKEN_INVALID', async () => {
    const { token } = await loggedIn()
    // a senha foi trocada (por outra sessão) 1 minuto depois da emissão do token
    users.rows[0]!.passwordChangedAt = new Date(Date.now() + 60_000)
    const res = await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('TOKEN_INVALID')
  })

  it('RN-ACE-15: senha atual errada dá 400 CURRENT_PASSWORD_INVALID (não 401)', async () => {
    const { token } = await loggedIn()
    const res = await change(token, { ...body, currentPassword: 'Errada123' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('CURRENT_PASSWORD_INVALID')
  })

  it('RN-ACE-15: sem login dá 401', async () => {
    const res = await api().post('/api/v1/users/me/password').send(body)
    expect(res.status).toBe(401)
  })
})

describe('formato de erro', () => {
  it('rota inexistente dá 404 NOT_FOUND no formato único', async () => {
    const res = await api().get('/api/v1/nao-existe')
    expect(res.status).toBe(404)
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND', requestId: expect.any(String) })
  })

  it('JSON malformado dá 400 VALIDATION_ERROR, sem stack trace', async () => {
    const res = await api()
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ quebrado')
    expect(res.status).toBe(400)
    expect(JSON.stringify(res.body)).not.toMatch(/at |node_modules/)
  })
})

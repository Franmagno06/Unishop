import { describe, expect, it } from 'vitest'
import { ApiError } from '../../../../shared/lib/api'
import { createMockAuth } from './auth.mock'
import { DEMO_EXPIRED_TOKEN, DEMO_INVALID_TOKEN, demoResetToken } from './demo-reset-token'
import { TEST_ACCOUNTS } from './test-accounts'

function setup() {
  const clock = { now: 1_000_000 }
  const mock = createMockAuth({ latencyMs: 0, now: () => clock.now })
  return { mock, clock }
}

const student = { email: TEST_ACCOUNTS.student.email, password: TEST_ACCOUNTS.student.password }
const wrong = { email: TEST_ACCOUNTS.student.email, password: 'Errada123' }

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof ApiError) return error
    throw error
  }
  throw new Error('era esperado um erro da API')
}

describe('API simulada · login (RN-ACE-08, 09, 12, 13)', () => {
  it('entra com a conta de teste do aluno', async () => {
    const { mock } = setup()
    const { data } = await mock.login(student)
    expect(data.user).toEqual({ id: 1, name: 'Aluno Teste', role: 'student' })
    expect(data.token).toBeTruthy()
  })

  it('entra com a conta de teste do admin, com perfil admin', async () => {
    const { mock } = setup()
    const { data } = await mock.login({
      email: TEST_ACCOUNTS.admin.email,
      password: TEST_ACCOUNTS.admin.password,
    })
    expect(data.user.role).toBe('admin')
  })

  it('ignora maiúsculas e espaços no e-mail', async () => {
    const { mock } = setup()
    await expect(
      mock.login({ email: '  ALUNO.TESTE@edu.unifor.br ', password: student.password }),
    ).resolves.toBeTruthy()
  })

  it('devolve 401 INVALID_CREDENTIALS para senha ou e-mail errados', async () => {
    const { mock } = setup()
    const wrongPassword = await failure(mock.login(wrong))
    const unknownEmail = await failure(mock.login({ email: 'ninguem@edu.unifor.br', password: 'Senha1234' }))

    for (const error of [wrongPassword, unknownEmail]) {
      expect(error.status).toBe(401)
      expect(error.code).toBe('INVALID_CREDENTIALS')
    }
  })

  it('devolve 403 ACCOUNT_SUSPENDED para a conta suspensa', async () => {
    const { mock } = setup()
    const error = await failure(mock.login({ email: TEST_ACCOUNTS.suspendedEmail, password: 'Senha1234' }))
    expect([error.status, error.code]).toEqual([403, 'ACCOUNT_SUSPENDED'])
  })

  it('bloqueia por 15 minutos depois de 5 senhas erradas seguidas', async () => {
    const { mock } = setup()

    for (let attempt = 1; attempt <= 5; attempt++) {
      expect((await failure(mock.login(wrong))).code).toBe('INVALID_CREDENTIALS')
    }

    const locked = await failure(mock.login(wrong))
    expect([locked.status, locked.code, locked.retryAfter]).toEqual([429, 'ACCOUNT_LOCKED', 900])
  })

  it('mesmo a senha certa é recusada durante o bloqueio, e o tempo restante diminui', async () => {
    const { mock, clock } = setup()
    for (let attempt = 1; attempt <= 5; attempt++) await failure(mock.login(wrong))

    clock.now += 5 * 60_000
    const error = await failure(mock.login(student))
    expect([error.code, error.retryAfter]).toEqual(['ACCOUNT_LOCKED', 600])
  })

  it('libera a conta quando o bloqueio vence e zera a contagem', async () => {
    const { mock, clock } = setup()
    for (let attempt = 1; attempt <= 5; attempt++) await failure(mock.login(wrong))

    clock.now += 15 * 60_000 + 1
    expect((await failure(mock.login(wrong))).code).toBe('INVALID_CREDENTIALS')
    await expect(mock.login(student)).resolves.toBeTruthy()
  })

  it('um login correto zera os erros anteriores', async () => {
    const { mock } = setup()
    for (let attempt = 1; attempt <= 4; attempt++) await failure(mock.login(wrong))
    await mock.login(student)

    for (let attempt = 1; attempt <= 4; attempt++) {
      expect((await failure(mock.login(wrong))).code).toBe('INVALID_CREDENTIALS')
    }
  })
})

describe('API simulada · cadastro (RN-ACE-02, 03)', () => {
  const base = { name: ' Ana Souza ', password: 'Senha1234', passwordConfirmation: 'Senha1234', acceptTerms: true }

  it('cria a conta com um e-mail novo do domínio', async () => {
    const { mock } = setup()
    const { data } = await mock.register({ ...base, email: 'ana@edu.unifor.br' })
    expect(data.user).toEqual({ id: 100, name: 'Ana Souza', role: 'student' })
  })

  it('devolve 409 EMAIL_ALREADY_REGISTERED para o e-mail da conta de teste', async () => {
    const { mock } = setup()
    const error = await failure(mock.register({ ...base, email: 'Aluno.Teste@edu.unifor.br' }))
    expect([error.status, error.code]).toEqual([409, 'EMAIL_ALREADY_REGISTERED'])
  })

  it('devolve 403 EMAIL_DOMAIN_NOT_ALLOWED fora do domínio', async () => {
    const { mock } = setup()
    const error = await failure(mock.register({ ...base, email: 'ana@gmail.com' }))
    expect([error.status, error.code]).toEqual([403, 'EMAIL_DOMAIN_NOT_ALLOWED'])
  })
})

describe('API simulada · recuperação de senha (RN-ACE-10)', () => {
  const email = TEST_ACCOUNTS.student.email
  const reset = (token: string, password = 'NovaSenha1') => ({ token, password, passwordConfirmation: password })

  it('o envio do link responde igual para e-mail cadastrado e não cadastrado', async () => {
    const { mock } = setup()

    await expect(mock.forgotPassword({ email })).resolves.toBeUndefined()
    await expect(mock.forgotPassword({ email: 'ninguem@edu.unifor.br' })).resolves.toBeUndefined()
    expect(mock.sentEmails).toEqual([email, 'ninguem@edu.unifor.br'])
  })

  it('com o link válido, troca a senha: a nova entra e a antiga deixa de valer', async () => {
    const { mock } = setup()

    await mock.resetPassword(reset(demoResetToken(email)))

    await expect(mock.login({ email, password: 'NovaSenha1' })).resolves.toBeTruthy()
    expect((await failure(mock.login({ email, password: TEST_ACCOUNTS.student.password }))).code).toBe('INVALID_CREDENTIALS')
  })

  it('o link é de uso único: o segundo uso dá TOKEN_INVALID', async () => {
    const { mock } = setup()
    const token = demoResetToken(email)

    await mock.resetPassword(reset(token))
    const second = await failure(mock.resetPassword(reset(token, 'OutraSenha2')))

    expect([second.status, second.code]).toEqual([400, 'TOKEN_INVALID'])
    // a senha continua sendo a primeira
    await expect(mock.login({ email, password: 'NovaSenha1' })).resolves.toBeTruthy()
  })

  it('link expirado: 400 TOKEN_EXPIRED', async () => {
    const { mock } = setup()
    const error = await failure(mock.resetPassword(reset(DEMO_EXPIRED_TOKEN)))
    expect([error.status, error.code]).toEqual([400, 'TOKEN_EXPIRED'])
  })

  it.each([[DEMO_INVALID_TOKEN], ['qualquer-coisa'], ['']])('token "%s": 400 TOKEN_INVALID', async (token) => {
    const { mock } = setup()
    const error = await failure(mock.resetPassword(reset(token)))
    expect([error.status, error.code]).toEqual([400, 'TOKEN_INVALID'])
  })

  it('redefinir a senha zera o bloqueio de login (backend.md §9)', async () => {
    const { mock } = setup()
    for (let attempt = 1; attempt <= 5; attempt++) await failure(mock.login(wrong))
    expect((await failure(mock.login(student))).code).toBe('ACCOUNT_LOCKED')

    await mock.resetPassword(reset(demoResetToken(email)))

    await expect(mock.login({ email, password: 'NovaSenha1' })).resolves.toBeTruthy()
  })

  it('link de um e-mail sem conta de teste "funciona" mas não cria acesso', async () => {
    const { mock } = setup()
    await expect(mock.resetPassword(reset(demoResetToken('outro@edu.unifor.br')))).resolves.toBeUndefined()
    expect((await failure(mock.login({ email: 'outro@edu.unifor.br', password: 'NovaSenha1' }))).code).toBe('INVALID_CREDENTIALS')
  })
})

import { PASSWORD_RESET_MINUTES } from '../../config/constants'
import type { Jwt } from '../../config/jwt'
import { AppError } from '../../shared/errors/app-error'
import type { MailProvider } from '../../shared/providers/mail/mail.provider'
import {
  DUMMY_HASH,
  generateToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from '../../shared/utils/hash'
import type { PublicUser, TokenRepository, UserRecord, UserRepository } from './auth.types'

export type AuthConfig = {
  allowedEmailDomain: string // sem "@", ex.: edu.unifor.br
  loginMaxAttempts: number
  loginLockMinutes: number
  emailVerificationRequired: boolean
  frontendUrl: string // origem usada no link do e-mail
}

export type AuthDeps = {
  users: UserRepository
  tokens: TokenRepository
  mail: MailProvider
  jwt: Jwt
  config: AuthConfig
  now?: () => Date
}

const toPublic = (u: UserRecord): PublicUser => ({ id: u.id, name: u.name, role: u.role })
const minutes = (n: number) => n * 60_000

export function createAuthService({
  users,
  tokens,
  mail,
  jwt,
  config,
  now = () => new Date(),
}: AuthDeps) {
  const normalize = (email: string) => email.trim().toLowerCase()

  // RN-ACE-01, 03, 04, 06; RN-ADM-11: o cadastro público só cria aluno.
  async function register(input: { name: string; email: string; password: string }) {
    const email = normalize(input.email)
    if (!email.endsWith(`@${config.allowedEmailDomain}`)) {
      throw new AppError(
        403,
        'EMAIL_DOMAIN_NOT_ALLOWED',
        `Use seu e-mail institucional @${config.allowedEmailDomain}.`,
      )
    }
    if (await users.findByEmail(email)) {
      throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'Este e-mail já está cadastrado.')
    }
    const user = await users.create({
      name: input.name,
      email,
      passwordHash: await hashPassword(input.password),
      verified: !config.emailVerificationRequired, // RN-ACE-07: confirmação por link fora do MVP
      termsAcceptedAt: now(),
    })
    return { user: toPublic(user) }
  }

  // RN-ACE-08, 09, 12, 13
  async function login(input: { email: string; password: string }) {
    const user = await users.findByEmail(normalize(input.email))
    const at = now()

    if (user?.lockedUntil && user.lockedUntil > at) {
      const retryAfter = Math.ceil((user.lockedUntil.getTime() - at.getTime()) / 1000)
      throw new AppError(
        429,
        'ACCOUNT_LOCKED',
        'Conta bloqueada temporariamente. Tente mais tarde.',
        undefined,
        { retryAfter },
      )
    }

    // Compara sempre, mesmo sem conta ou sem senha (conta Google), para não vazar pelo tempo.
    const valid = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH)
    if (!user || !user.passwordHash || !valid) {
      if (user) {
        const previous = user.lockedUntil && user.lockedUntil <= at ? 0 : user.failedLoginAttempts
        const attempts = previous + 1
        const locks = attempts >= config.loginMaxAttempts
        await users.recordFailedLogin(
          user.id,
          locks ? 0 : attempts,
          locks ? new Date(at.getTime() + minutes(config.loginLockMinutes)) : null,
        )
      }
      throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
    }

    if (user.status !== 'active') {
      throw new AppError(403, 'ACCOUNT_SUSPENDED', 'Sua conta está suspensa.')
    }
    if (config.emailVerificationRequired && !user.verified) {
      throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Confirme seu e-mail para entrar.')
    }

    await users.recordSuccessfulLogin(user.id, at)
    return { token: jwt.sign(user), user: toPublic(user) }
  }

  // RN-ACE-10: mesma resposta exista ou não a conta; só envia se a conta existir e estiver ativa.
  async function forgotPassword(input: { email: string }) {
    const user = await users.findByEmail(normalize(input.email))
    if (!user || user.status !== 'active') return

    const at = now()
    const token = generateToken()
    await tokens.invalidatePending(user.id, 'redefinicao_senha', at)
    await tokens.create({
      userId: user.id,
      type: 'redefinicao_senha',
      tokenHash: hashToken(token),
      expiresAt: new Date(at.getTime() + minutes(PASSWORD_RESET_MINUTES)),
    })
    await mail.sendPasswordReset({
      to: user.email,
      name: user.name,
      link: `${config.frontendUrl}/redefinir-senha?token=${token}`,
      expiresInMinutes: PASSWORD_RESET_MINUTES,
    })
  }

  // RN-ACE-04, 10: link de 30 min, uso único; a nova senha derruba os tokens antigos.
  async function resetPassword(input: { token: string; password: string }) {
    const at = now()
    const record = await tokens.findByHash(hashToken(input.token), 'redefinicao_senha')
    if (!record || record.usedAt) throw new AppError(400, 'TOKEN_INVALID', 'Link inválido.')
    if (record.expiresAt <= at) {
      throw new AppError(400, 'TOKEN_EXPIRED', 'Link expirado. Peça outro.')
    }

    // Consome o link antes de trocar a senha: dois pedidos simultâneos não passam os dois.
    if (!(await tokens.markUsed(record.id, at))) {
      throw new AppError(400, 'TOKEN_INVALID', 'Link inválido.')
    }
    await users.updatePassword(record.userId, await hashPassword(input.password), at)
  }

  // RN-ACE-15: vale para aluno e admin; devolve token novo.
  async function changePassword(
    userId: number,
    input: { currentPassword: string; newPassword: string },
  ) {
    const user = await users.findById(userId)
    if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Faça login para continuar.')
    // Conta Google sem senha não tem "senha atual" (define a primeira pela recuperação).
    if (!user.passwordHash || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw new AppError(400, 'CURRENT_PASSWORD_INVALID', 'A senha atual está incorreta.')
    }
    await users.updatePassword(user.id, await hashPassword(input.newPassword), now())
    return { token: jwt.sign(user) }
  }

  async function me(userId: number) {
    const user = await users.findById(userId)
    if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Faça login para continuar.')
    return { user: toPublic(user), needsTermsAcceptance: user.termsAcceptedAt === null }
  }

  return { register, login, forgotPassword, resetPassword, changePassword, me }
}
export type AuthService = ReturnType<typeof createAuthService>

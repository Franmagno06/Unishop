import type { UserRole } from '../../shared/types/express'

export type AccountStatus = 'active' | 'suspended' | 'deleted'

// Forma do usuário usada pelas regras. O repository real (Prisma) converte as colunas em português
// (usuario.*) para este formato; o schema do banco é do Pedro.
export type UserRecord = {
  id: number
  name: string
  email: string
  passwordHash: string | null
  googleSub: string | null
  course: string | null
  whatsapp: string | null
  photoUrl: string | null
  role: UserRole
  status: AccountStatus
  verified: boolean
  termsAcceptedAt: Date | null
  failedLoginAttempts: number
  lockedUntil: Date | null
  passwordChangedAt: Date | null
  lastSeen: Date | null
}

export type NewUser = {
  name: string
  email: string
  passwordHash: string
  verified: boolean
  termsAcceptedAt: Date
}

export type NewGoogleUser = { name: string; email: string; googleSub: string }

export type ProfileCompletion = {
  termsAcceptedAt: Date
  course: string | null
  whatsapp: string | null
}

export interface UserRepository {
  findById(id: number): Promise<UserRecord | null>
  findByGoogleSub(googleSub: string): Promise<UserRecord | null>
  /** Conta nova por Google: ativa, sem senha, verificada e sem aceite dos Termos (RN-ACE-14). */
  createGoogle(data: NewGoogleUser): Promise<UserRecord>
  /** Vincula o Google a uma conta existente e a marca como verificada (RN-ACE-14). */
  linkGoogle(id: number, googleSub: string): Promise<void>
  /** Grava o aceite dos Termos e, se vierem, curso e WhatsApp (RN-ACE-06, 14). */
  completeProfile(id: number, data: ProfileCompletion): Promise<void>
  /** Sem diferenciar maiúsculas (RN-ACE-03). */
  findByEmail(email: string): Promise<UserRecord | null>
  create(data: NewUser): Promise<UserRecord>
  recordFailedLogin(id: number, attempts: number, lockedUntil: Date | null): Promise<void>
  recordSuccessfulLogin(id: number, at: Date): Promise<void>
  /** Grava o novo hash e zera tentativas e bloqueio (RN-ACE-10, 15). */
  updatePassword(id: number, passwordHash: string, changedAt: Date): Promise<void>
  /** UPDATE condicional: só grava se o último acesso for mais antigo que `olderThan`. */
  touchLastSeen(id: number, at: Date, olderThan: Date): Promise<void>
}

export type TokenType = 'confirmacao_email' | 'redefinicao_senha' | 'troca_email'

export type TokenRecord = {
  id: number
  userId: number
  type: TokenType
  expiresAt: Date
  usedAt: Date | null
}

export interface TokenRepository {
  create(data: {
    userId: number
    type: TokenType
    tokenHash: string
    expiresAt: Date
  }): Promise<void>
  findByHash(tokenHash: string, type: TokenType): Promise<TokenRecord | null>
  /** Consome o link de forma atômica: `false` se outra requisição já o usou (RN-ACE-10). */
  markUsed(id: number, at: Date): Promise<boolean>
  /** Invalida os links ainda abertos do usuário ao pedir um novo. */
  invalidatePending(userId: number, type: TokenType, at: Date): Promise<void>
}

export type PublicUser = { id: number; name: string; role: UserRole }

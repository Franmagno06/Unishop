import { AppError } from '../../src/shared/errors/app-error'
import type { ProfileRepository } from '../../src/modules/users/users.types'
import type {
  NewUser,
  ProfileCompletion,
  TokenRecord,
  TokenRepository,
  TokenType,
  UserRecord,
  UserRepository,
} from '../../src/modules/auth/auth.types'
import type {
  MailProvider,
  PasswordResetMail,
} from '../../src/shared/providers/mail/mail.provider'
import type { GoogleIdentity, OAuthProvider } from '../../src/shared/providers/oauth/oauth.provider'

// Repositories em memória: testam as regras sem banco. Os testes contra o banco real entram
// quando o schema estiver pronto.
export function createFakeUsers() {
  const rows: UserRecord[] = []
  const profiles = new Map<number, ProfileCompletion>()
  let nextId = 1

  const repo: UserRepository = {
    async findById(id) {
      return rows.find((u) => u.id === id) ?? null
    },
    async findByEmail(email) {
      return rows.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null
    },
    async findByGoogleSub(googleSub) {
      return rows.find((u) => u.googleSub === googleSub) ?? null
    },
    async createGoogle(data) {
      const user: UserRecord = {
        id: nextId++,
        role: 'student',
        status: 'active',
        passwordHash: null,
        course: null,
        whatsapp: null,
        photoUrl: null,
        verified: true,
        termsAcceptedAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        passwordChangedAt: null,
        lastSeen: null,
        ...data,
      }
      rows.push(user)
      return user
    },
    async linkGoogle(id, googleSub) {
      const u = rows.find((r) => r.id === id)!
      u.googleSub = googleSub
      u.verified = true
    },
    async completeProfile(id, data) {
      const u = rows.find((r) => r.id === id)!
      u.termsAcceptedAt = data.termsAcceptedAt
      profiles.set(id, data)
    },
    async create(data: NewUser) {
      const user: UserRecord = {
        id: nextId++,
        role: 'student',
        status: 'active',
        googleSub: null,
        course: null,
        whatsapp: null,
        photoUrl: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        passwordChangedAt: null,
        lastSeen: null,
        ...data,
      }
      rows.push(user)
      return user
    },
    async recordFailedLogin(id, attempts, lockedUntil) {
      const u = rows.find((r) => r.id === id)!
      u.failedLoginAttempts = attempts
      u.lockedUntil = lockedUntil
    },
    async recordSuccessfulLogin(id, at) {
      const u = rows.find((r) => r.id === id)!
      u.failedLoginAttempts = 0
      u.lockedUntil = null
      u.lastSeen = at
    },
    async updatePassword(id, passwordHash, changedAt) {
      const u = rows.find((r) => r.id === id)!
      u.passwordHash = passwordHash
      u.passwordChangedAt = changedAt
      u.failedLoginAttempts = 0
      u.lockedUntil = null
    },
    async touchLastSeen(id, at, olderThan) {
      const u = rows.find((r) => r.id === id)!
      if (!u.lastSeen || u.lastSeen < olderThan) u.lastSeen = at
    },
  }
  return { repo, rows, profiles }
}

export function createFakeTokens() {
  const rows: (TokenRecord & { tokenHash: string })[] = []
  let nextId = 1
  const repo: TokenRepository = {
    async create(data) {
      rows.push({ id: nextId++, usedAt: null, ...data })
    },
    async findByHash(tokenHash: string, type: TokenType) {
      return rows.find((t) => t.tokenHash === tokenHash && t.type === type) ?? null
    },
    async markUsed(id, at) {
      const t = rows.find((r) => r.id === id)!
      if (t.usedAt) return false
      t.usedAt = at
      return true
    },
    async invalidatePending(userId, type, at) {
      for (const t of rows) if (t.userId === userId && t.type === type && !t.usedAt) t.usedAt = at
    },
  }
  return { repo, rows }
}

export function createFakeMail() {
  const sent: PasswordResetMail[] = []
  const provider: MailProvider = {
    async sendPasswordReset(mail) {
      sent.push(mail)
    },
  }
  return { provider, sent }
}

export function createFakeOAuth() {
  let identity: GoogleIdentity | null = null
  const provider: OAuthProvider = {
    async verifyIdToken() {
      if (!identity) throw new AppError(401, 'TOKEN_INVALID', 'Token inválido.')
      return identity
    },
  }
  return { provider, set: (i: GoogleIdentity | null) => (identity = i) }
}

export type FakeListing = {
  id: number
  userId: number
  status: 'ativo' | 'pausado' | 'vendido'
  whatsapp: string
}

// Perfil em memória sobre as mesmas linhas de usuário do fake de auth; `listings` simula a tabela anuncio.
export function createFakeProfiles(userRows: UserRecord[]) {
  const listings: FakeListing[] = []
  const find = (id: number) => userRows.find((r) => r.id === id)!

  const repo: ProfileRepository = {
    async updateProfile(id, patch) {
      const user = find(id)
      const before = user.whatsapp
      if (patch.name !== undefined) user.name = patch.name
      if (patch.email !== undefined) user.email = patch.email
      if (patch.course !== undefined) user.course = patch.course
      if (patch.whatsapp !== undefined) user.whatsapp = patch.whatsapp
      if (patch.whatsapp && patch.whatsapp !== before) {
        for (const l of listings) {
          if (l.userId === id && l.status === 'ativo') l.whatsapp = patch.whatsapp
        }
      }
    },
    async anonymize(id) {
      const user = find(id)
      Object.assign(user, {
        name: 'Usuário removido',
        email: `removido_${id}@removido.invalid`,
        passwordHash: null,
        googleSub: null,
        whatsapp: null,
        course: null,
        photoUrl: null,
        status: 'deleted',
      })
    },
  }
  return { repo, listings }
}

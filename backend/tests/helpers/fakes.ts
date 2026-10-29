import type {
  NewUser,
  TokenRecord,
  TokenRepository,
  TokenType,
  UserRecord,
  UserRepository,
} from '../../src/modules/auth/auth.types'
import type { MailProvider, PasswordResetMail } from '../../src/shared/providers/mail/mail.provider'

// Repositories em memória: testam as regras sem banco. Os testes contra o banco real entram
// quando o schema estiver pronto.
export function createFakeUsers() {
  const rows: UserRecord[] = []
  let nextId = 1

  const repo: UserRepository = {
    async findById(id) {
      return rows.find((u) => u.id === id) ?? null
    },
    async findByEmail(email) {
      return rows.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null
    },
    async create(data: NewUser) {
      const user: UserRecord = {
        id: nextId++,
        role: 'student',
        status: 'active',
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
  return { repo, rows }
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

import { AppError } from '../../shared/errors/app-error'
import type { Db } from '../../shared/database/prisma'
import type { User } from '../../generated/prisma/client'
import type { UserRole } from '../../shared/types/express'
import type {
  AccountStatus,
  TokenRepository,
  UserRecord,
  UserRepository,
} from './auth.types'

// O banco guarda os valores em português (bd.md §7); o código usa inglês.
const ROLE_FROM_DB: Record<string, UserRole> = { aluno: 'student', admin: 'admin' }
const STATUS_FROM_DB: Record<string, AccountStatus> = {
  ativa: 'active',
  suspensa: 'suspended',
  excluida: 'deleted',
}

function toRecord(row: User): UserRecord {
  const role = ROLE_FROM_DB[row.role]
  const status = STATUS_FROM_DB[row.accountStatus]
  if (!role || !status) throw new Error(`Valor inesperado no banco para o usuário ${row.id}`)
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    googleSub: row.googleSub,
    course: row.course,
    whatsapp: row.whatsapp,
    photoUrl: row.photoUrl,
    role,
    status,
    verified: row.verified,
    termsAcceptedAt: row.termsAcceptedAt,
    failedLoginAttempts: row.loginAttempts,
    lockedUntil: row.lockedUntil,
    passwordChangedAt: row.passwordChangedAt,
    lastSeen: row.lastSeen,
  }
}

export function createPrismaUserRepository(db: Db): UserRepository {
  return {
    async findById(id) {
      const row = await db.user.findUnique({ where: { id } })
      return row ? toRecord(row) : null
    },

    async findByGoogleSub(googleSub) {
      const row = await db.user.findUnique({ where: { googleSub } })
      return row ? toRecord(row) : null
    },

    async createGoogle(data) {
      try {
        const row = await db.user.create({
          data: { name: data.name, email: data.email, googleSub: data.googleSub, verified: true },
        })
        return toRecord(row)
      } catch (err) {
        if ((err as { code?: string }).code === 'P2002') {
          throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'Este e-mail já está cadastrado.')
        }
        throw err
      }
    },

    async linkGoogle(id, googleSub) {
      await db.user.update({ where: { id }, data: { googleSub, verified: true } })
    },

    // Curso e WhatsApp só entram se vieram; nunca apagam o que já existe.
    async completeProfile(id, data) {
      await db.user.update({
        where: { id },
        data: {
          termsAcceptedAt: data.termsAcceptedAt,
          ...(data.course !== null && { course: data.course }),
          ...(data.whatsapp !== null && { whatsapp: data.whatsapp }),
        },
      })
    },

    // Consulta por lower(email) para usar o índice uq_usuario_email_lower (RN-ACE-03).
    async findByEmail(email) {
      const found = await db.$queryRaw<{ id: number }[]>`
        SELECT id_usuario AS id FROM usuario WHERE lower(email) = lower(${email}) LIMIT 1`
      const id = found[0]?.id
      return id === undefined ? null : this.findById(id)
    },

    async create(data) {
      try {
        const row = await db.user.create({
          data: {
            name: data.name,
            email: data.email,
            passwordHash: data.passwordHash,
            verified: data.verified,
            termsAcceptedAt: data.termsAcceptedAt,
          },
        })
        return toRecord(row)
      } catch (err) {
        // Dois cadastros simultâneos com o mesmo e-mail: o índice único do banco decide.
        if ((err as { code?: string }).code === 'P2002') {
          throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'Este e-mail já está cadastrado.')
        }
        throw err
      }
    },

    async recordFailedLogin(id, attempts, lockedUntil) {
      await db.user.update({ where: { id }, data: { loginAttempts: attempts, lockedUntil } })
    },

    async recordSuccessfulLogin(id, at) {
      await db.user.update({
        where: { id },
        data: { loginAttempts: 0, lockedUntil: null, lastSeen: at },
      })
    },

    async updatePassword(id, passwordHash, changedAt) {
      await db.user.update({
        where: { id },
        data: { passwordHash, passwordChangedAt: changedAt, loginAttempts: 0, lockedUntil: null },
      })
    },

    async touchLastSeen(id, at, olderThan) {
      await db.user.updateMany({
        where: { id, OR: [{ lastSeen: null }, { lastSeen: { lt: olderThan } }] },
        data: { lastSeen: at },
      })
    },
  }
}

export function createPrismaTokenRepository(db: Db): TokenRepository {
  return {
    async create(data) {
      await db.userToken.create({
        data: {
          userId: data.userId,
          type: data.type,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
        },
      })
    },

    async findByHash(tokenHash, type) {
      const row = await db.userToken.findUnique({ where: { tokenHash } })
      if (!row || row.type !== type) return null
      return {
        id: row.id,
        userId: row.userId,
        type,
        expiresAt: row.expiresAt,
        usedAt: row.usedAt,
      }
    },

    // UPDATE condicional: de dois pedidos simultâneos com o mesmo link, só um recebe `true`.
    async markUsed(id, at) {
      const { count } = await db.userToken.updateMany({
        where: { id, usedAt: null },
        data: { usedAt: at },
      })
      return count === 1
    },

    async invalidatePending(userId, type, at) {
      await db.userToken.updateMany({
        where: { userId, type, usedAt: null },
        data: { usedAt: at },
      })
    },
  }
}

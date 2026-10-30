import type { StorageProvider } from '../../src/shared/providers/storage/storage.provider'
import type { CategoryRepository } from '../../src/modules/categories/categories.types'
import type {
  ListingDetailRecord,
  ListingRepository,
  ListingSummaryRecord,
} from '../../src/modules/listings/listings.types'
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
import type { MailProvider, PasswordResetMail } from '../../src/shared/providers/mail/mail.provider'
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
    async setPhoto(id, url) {
      find(id).photoUrl = url
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

// Categorias em memória: cada linha já traz a contagem de anúncios visíveis (a regra de visibilidade
// é testada no banco, em tests/db).
export function createFakeCategories(
  rows: { id: number; name: string; activeListingCount: number }[],
) {
  const repo: CategoryRepository = { listWithCounts: async () => rows.map((r) => ({ ...r })) }
  return { repo }
}

// Anúncios em memória para as regras da rota (404 por visibilidade, visualização, serialização).
// Filtro, ordenação e paginação de verdade são testados no banco (tests/db/listings.http.test.ts).
export function createFakeListings(
  details: ListingDetailRecord[],
  summaries: ListingSummaryRecord[] = [],
) {
  const views = new Map<number, number>()
  const repo: ListingRepository = {
    findVisiblePage: async (_filters, pagination) => ({
      items: summaries.slice((pagination.page - 1) * pagination.limit).slice(0, pagination.limit),
      total: summaries.length,
    }),
    findRecent: async (limit) => summaries.slice(0, limit),
    findById: async (id) => details.find((d) => d.id === id) ?? null,
    incrementViews: async (id) => void views.set(id, (views.get(id) ?? 0) + 1),
    categoryExists: async () => true,
    findByOwner: async () => details,
    update: async () => undefined,
    changeStatus: async () => true,
    softDelete: async () => 'ok',
    countOrders: async () => 0,
    createWithImage: async () => {
      throw new Error('fora do escopo deste fake')
    },
    addImage: async () => {
      throw new Error('fora do escopo deste fake')
    },
    removeImage: async () => {
      throw new Error('fora do escopo deste fake')
    },
  }
  return { repo, views }
}

// Storage em memória: guarda o que foi enviado e o que foi removido.
export function createFakeStorage() {
  const uploaded: { publicId: string; url: string }[] = []
  const removed: string[] = []
  let n = 0
  const provider: StorageProvider = {
    async upload({ folder }) {
      const publicId = `${folder}/fake-${++n}.png`
      const result = { publicId, url: `http://x/uploads/${publicId}` }
      uploaded.push(result)
      return result
    },
    async remove(publicId) {
      removed.push(publicId)
    },
  }
  return { provider, uploaded, removed }
}

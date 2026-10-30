import { createApp } from '../../src/app'
import { createJwt } from '../../src/config/jwt'
import {
  createPrismaTokenRepository,
  createPrismaUserRepository,
} from '../../src/modules/auth/auth.repository'
import { createPrismaCategoryRepository } from '../../src/modules/categories/categories.repository'
import { createPrismaListingRepository } from '../../src/modules/listings/listings.repository'
import type { ListingRepository } from '../../src/modules/listings/listings.types'
import { createPrismaProfileRepository } from '../../src/modules/users/users.repository'
import { createFakeMail, createFakeOAuth, createFakeStorage } from './fakes'
import { testDb } from './db'

// App completo com os repositories reais (Prisma) sobre o banco de teste. Os e-mails, o Google e o
// storage continuam falsos. O token é assinado direto, sem passar pelo login (bcrypt custo 12 é lento).
export function buildDbApp(overrides: { listings?: Partial<ListingRepository> } = {}) {
  const storage = createFakeStorage()
  const app = createApp({
    users: createPrismaUserRepository(testDb),
    profiles: createPrismaProfileRepository(testDb),
    tokens: createPrismaTokenRepository(testDb),
    mail: createFakeMail().provider,
    oauth: createFakeOAuth().provider,
    categories: createPrismaCategoryRepository(testDb),
    listings: { ...createPrismaListingRepository(testDb), ...overrides.listings },
    storage: storage.provider,
  })
  const jwt = createJwt(process.env.JWT_SECRET!, '2h')
  const auth = (user: { id: number; role?: 'student' | 'admin' }) => ({
    Authorization: `Bearer ${jwt.sign({ id: user.id, role: user.role ?? 'student' })}`,
  })
  return { app, auth, storage }
}

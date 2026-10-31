import { createPrismaAdminUsersRepository } from '../../src/admin/users/admin-users.repository'
import type { AuditWriter } from '../../src/admin/audit-logs/audit-logs.types'
import { createPrismaAdminListingsRepository } from '../../src/admin/listings/admin-listings.repository'
import type { MailProvider } from '../../src/shared/providers/mail/mail.provider'
import { createApp } from '../../src/app'
import { createPrismaAuditLogRepository } from '../../src/admin/audit-logs/audit-logs.repository'
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
export function buildDbApp(
  overrides: {
    listings?: Partial<ListingRepository>
    writeAuditLog?: AuditWriter
    mail?: MailProvider
  } = {},
) {
  const storage = createFakeStorage()
  const mail = createFakeMail()
  const app = createApp({
    users: createPrismaUserRepository(testDb),
    profiles: createPrismaProfileRepository(testDb),
    tokens: createPrismaTokenRepository(testDb),
    mail: overrides.mail ?? mail.provider,
    oauth: createFakeOAuth().provider,
    categories: createPrismaCategoryRepository(testDb),
    listings: { ...createPrismaListingRepository(testDb), ...overrides.listings },
    storage: storage.provider,
    admin: {
      auditLogs: createPrismaAuditLogRepository(testDb),
      listings: createPrismaAdminListingsRepository(testDb, {
        ...(overrides.writeAuditLog && { writeAuditLog: overrides.writeAuditLog }),
      }),
      users: createPrismaAdminUsersRepository(testDb, {
        ...(overrides.writeAuditLog && { writeAuditLog: overrides.writeAuditLog }),
      }),
    },
  })
  const jwt = createJwt(process.env.JWT_SECRET!, '2h')
  const auth = (user: { id: number; role?: 'student' | 'admin' }) => ({
    Authorization: `Bearer ${jwt.sign({ id: user.id, role: user.role ?? 'student' })}`,
  })
  return { app, auth, storage, mail }
}

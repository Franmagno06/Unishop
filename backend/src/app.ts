import compression from 'compression'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { resolve } from 'node:path'
import { env } from './config/env'
import { createJwt } from './config/jwt'
import {
  createPrismaTokenRepository,
  createPrismaUserRepository,
} from './modules/auth/auth.repository'
import type { PrismaClient } from './generated/prisma/client'
import { createJobRegistry } from './jobs/registry'
import { createJobsRoutes } from './jobs/jobs.routes'
import { createPrismaOrderRepository } from './modules/orders/orders.repository'
import { createOrdersRoutes } from './modules/orders/orders.routes'
import { createOrdersService } from './modules/orders/orders.service'
import type { OrderRepository } from './modules/orders/orders.types'
import { createPrismaPaymentRepository } from './modules/payments/payments.repository'
import { createPaymentsRoutes } from './modules/payments/payments.routes'
import { createPaymentsService } from './modules/payments/payments.service'
import type { PaymentRepository } from './modules/payments/payments.types'
import { prisma } from './shared/database/prisma'
import { buildPaymentGateway } from './shared/providers/payment'
import type { MockPaymentGateway } from './shared/providers/payment/mock.provider'
import type { PaymentGateway } from './shared/providers/payment/payment.gateway'
import { consoleMailProvider } from './shared/providers/mail/console.provider'
import { createAuthService } from './modules/auth/auth.service'
import { createAuthRoutes } from './modules/auth/auth.routes'
import { createPrismaListingRepository } from './modules/listings/listings.repository'
import { createListingsRoutes } from './modules/listings/listings.routes'
import { createListingsService } from './modules/listings/listings.service'
import type { ListingRepository } from './modules/listings/listings.types'
import { createPrismaCategoryRepository } from './modules/categories/categories.repository'
import { createCategoriesRoutes } from './modules/categories/categories.routes'
import { createCategoriesService } from './modules/categories/categories.service'
import type { CategoryRepository } from './modules/categories/categories.types'
import type { TokenRepository, UserRepository } from './modules/auth/auth.types'
import { createPrismaProfileRepository } from './modules/users/users.repository'
import { createUsersRoutes } from './modules/users/users.routes'
import { createUsersService } from './modules/users/users.service'
import type { ProfileRepository } from './modules/users/users.types'
import { createPrismaAdminListingsRepository } from './admin/listings/admin-listings.repository'
import { createAdminListingsRoutes } from './admin/listings/admin-listings.routes'
import { createAdminListingsService } from './admin/listings/admin-listings.service'
import type { AdminListingsRepository } from './admin/listings/admin-listings.types'
import { createAdminRoutes } from './admin/admin.routes'
import { createPrismaAdminUsersRepository } from './admin/users/admin-users.repository'
import { createAdminUsersRoutes } from './admin/users/admin-users.routes'
import { createAdminUsersService } from './admin/users/admin-users.service'
import type { AdminUsersRepository } from './admin/users/admin-users.types'
import { createPrismaAuditLogRepository } from './admin/audit-logs/audit-logs.repository'
import { createAuditLogsRoutes } from './admin/audit-logs/audit-logs.routes'
import { createAuditLogsService } from './admin/audit-logs/audit-logs.service'
import type { AuditLogRepository } from './admin/audit-logs/audit-logs.types'
import { createAuthenticate } from './shared/middlewares/authenticate'
import { errorHandler, notFoundHandler } from './shared/middlewares/error-handler'
import { createRateLimiter } from './shared/middlewares/rate-limiter'
import { requestId } from './shared/middlewares/request-id'
import type { MailProvider } from './shared/providers/mail/mail.provider'
import { createGoogleProvider } from './shared/providers/oauth/google.provider'
import type { OAuthProvider } from './shared/providers/oauth/oauth.provider'
import { createLocalStorageProvider } from './shared/providers/storage/local.provider'
import type { StorageProvider } from './shared/providers/storage/storage.provider'

/** Repositories da área admin (src/admin/). As fatias seguintes acrescentam `users` e `listings`. */
export type AdminDeps = {
  auditLogs: AuditLogRepository
  users?: AdminUsersRepository
  listings?: AdminListingsRepository
}

export type AppDeps = {
  users: UserRepository
  profiles: ProfileRepository
  tokens: TokenRepository
  mail: MailProvider
  oauth: OAuthProvider
  categories?: CategoryRepository
  listings?: ListingRepository
  storage?: StorageProvider
  admin?: AdminDeps
  /** Pedidos e pagamentos (Etapas 6 e 7). Os três juntos: sem o gateway não há cobrança. */
  orders?: OrderRepository
  payments?: PaymentRepository
  gateway?: PaymentGateway
  /** Banco, para o /health/db e o job de limpeza de tokens. */
  db?: PrismaClient
  /** Pasta servida em /uploads. Só com o driver local (desenvolvimento e teste). */
  uploadsDir?: string
  now?: () => Date
}

// Sem `deps` só a rota de saúde sobe. Os testes injetam repositories em memória.
export function createApp(deps?: AppDeps) {
  const app = express()

  app.set('trust proxy', 1) // atrás da Vercel: o IP real vem do cabeçalho (rate limit)
  app.use(requestId)
  app.use(helmet())
  app.use(cors({ origin: env.FRONTEND_URL }))
  app.use(compression())
  app.use(express.json({ limit: '100kb' }))

  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  if (deps?.db) {
    const db = deps.db
    // Confere o banco (backend.md §9.11). Serve também para manter o projeto Supabase ativo.
    app.get('/api/v1/health/db', async (_req, res) => {
      try {
        await db.$queryRaw`SELECT 1`
        res.json({ status: 'ok' })
      } catch {
        res.status(503).json({ status: 'error' })
      }
    })
  }

  if (deps) {
    const jwt = createJwt(env.JWT_SECRET, env.JWT_EXPIRES_IN)
    const service = createAuthService({
      ...deps,
      jwt,
      config: {
        allowedEmailDomain: env.ALLOWED_EMAIL_DOMAIN,
        loginMaxAttempts: env.LOGIN_MAX_ATTEMPTS,
        loginLockMinutes: env.LOGIN_LOCK_MINUTES,
        emailVerificationRequired: env.EMAIL_VERIFICATION_REQUIRED,
        frontendUrl: env.FRONTEND_URL[0] ?? '',
      },
    })
    const authenticate = createAuthenticate(deps.users, jwt, deps.now)
    // /auth: 10 por minuto por IP (backend.md §6). Desligado nos testes para não interferir.
    const limiter =
      env.APP_ENV === 'test'
        ? (((_req, _res, next) => next()) satisfies express.RequestHandler)
        : createRateLimiter(10)
    const routes = createAuthRoutes(service, authenticate, limiter)
    const usersService = createUsersService({
      users: deps.users,
      profiles: deps.profiles,
      config: { allowedEmailDomain: env.ALLOWED_EMAIL_DOMAIN },
      ...(deps.storage && { storage: deps.storage }),
    })
    app.use('/api/v1/auth', routes.auth)
    app.use('/api/v1/users', routes.users)
    app.use(
      '/api/v1/users',
      createUsersRoutes(usersService, authenticate, { avatar: Boolean(deps.storage) }),
    )
    if (deps.categories) {
      const categoriesService = createCategoriesService({ categories: deps.categories })
      app.use('/api/v1/categories', createCategoriesRoutes(categoriesService, authenticate))
    }
    if (deps.listings) {
      if (!deps.storage) throw new Error('Os anúncios precisam de um StorageProvider.')
      const listingsService = createListingsService({
        listings: deps.listings,
        users: deps.users,
        storage: deps.storage,
      })
      app.use('/api/v1/listings', createListingsRoutes(listingsService, authenticate))
    }
    // RN-ADM-01: toda a área admin atrás de uma proteção só.
    app.use(
      '/api/v1/admin',
      createAdminRoutes(authenticate, {
        ...(deps.admin && {
          auditLogs: createAuditLogsRoutes(
            createAuditLogsService({ auditLogs: deps.admin.auditLogs }),
          ),
          ...(deps.admin.listings && {
            listings: createAdminListingsRoutes(
              createAdminListingsService({
                listings: deps.admin.listings,
                mail: deps.mail,
                ...(deps.now && { now: deps.now }),
              }),
            ),
          }),
          ...(deps.admin.users && {
            users: createAdminUsersRoutes(
              createAdminUsersService({
                users: deps.admin.users,
                ...(deps.now && { now: deps.now }),
              }),
            ),
          }),
        }),
      }),
    )
    if (deps.orders && deps.payments && deps.gateway) {
      const ordersService = createOrdersService({
        orders: deps.orders,
        gateway: deps.gateway,
        config: {
          serviceFeePercent: env.SERVICE_FEE_PERCENT,
          expirationMinutes: env.PIX_EXPIRATION_MINUTES,
        },
        ...(deps.now && { now: deps.now }),
      })
      const paymentsService = createPaymentsService({
        payments: deps.payments,
        orders: deps.orders,
        ordersService,
        gateway: deps.gateway,
        mail: deps.mail,
        config: { expirationMinutes: env.PIX_EXPIRATION_MINUTES },
        ...(deps.now && { now: deps.now }),
      })
      const noLimit = ((_req, _res, next) => next()) satisfies express.RequestHandler
      const simulator =
        deps.gateway.driver === 'mock' && (env.APP_ENV === 'development' || env.APP_ENV === 'test')
          ? (deps.gateway as MockPaymentGateway)
          : undefined
      app.use('/api/v1/orders', createOrdersRoutes(ordersService, authenticate))
      app.use(
        '/api/v1/payments',
        createPaymentsRoutes(paymentsService, authenticate, {
          webhookLimiter: env.APP_ENV === 'test' ? noLimit : createRateLimiter(300),
          ...(simulator && { devSimulator: simulator }),
        }),
      )
      if (deps.db) {
        // Jobs por endpoint em produção (Vercel Cron / cron-job.org); o dev-server usa o node-cron.
        const registry = createJobRegistry({
          db: deps.db,
          orders: deps.orders,
          ordersService,
          paymentsService,
          expirationMinutes: env.PIX_EXPIRATION_MINUTES,
          ...(deps.now && { now: deps.now }),
        })
        app.locals.jobs = registry
        app.use('/api/v1/internal/jobs', createJobsRoutes(registry, env.CRON_SECRET))
      }
    }
  }

  // Imagens do driver local. O Helmet manda `same-origin`, o que impediria o front (outra porta)
  // de exibir a imagem; a pasta só tem fotos de anúncio, que são públicas na vitrine.
  if (deps?.uploadsDir) {
    app.use(
      '/uploads',
      (_req, res, next) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
        next()
      },
      express.static(deps.uploadsDir),
    )
  }

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}

// O driver local grava no disco do servidor: só vale em desenvolvimento e teste (api.md §6.4).
// Fora deles a API não sobe até existir o provider da Cloudinary (Etapa 10).
const UPLOADS_DIR = resolve(process.cwd(), 'uploads')
function pickStorageProvider() {
  const local = env.APP_ENV === 'development' || env.APP_ENV === 'test'
  if (env.STORAGE_DRIVER !== 'local' || !local) {
    throw new Error(
      `STORAGE_DRIVER "${env.STORAGE_DRIVER}" sem provider em APP_ENV "${env.APP_ENV}".`,
    )
  }
  const apiUrl = env.API_PUBLIC_URL ?? `http://localhost:${env.PORT}`
  return createLocalStorageProvider({ dir: UPLOADS_DIR, baseUrl: `${apiUrl}/uploads` })
}

// O provider de console imprime o link de redefinição no log: só vale em desenvolvimento e teste.
// Fora deles a API não sobe até existir um provider real (Resend/Mailtrap, api.md §6.3).
function pickMailProvider() {
  const local = env.APP_ENV === 'development' || env.APP_ENV === 'test'
  if (env.MAIL_DRIVER !== 'console' || !local) {
    throw new Error(`MAIL_DRIVER "${env.MAIL_DRIVER}" sem provider em APP_ENV "${env.APP_ENV}".`)
  }
  return consoleMailProvider
}

// Ponto único de composição: repositories reais (Prisma).
export const app = createApp({
  users: createPrismaUserRepository(prisma),
  profiles: createPrismaProfileRepository(prisma),
  tokens: createPrismaTokenRepository(prisma),
  mail: pickMailProvider(),
  oauth: createGoogleProvider(env.GOOGLE_CLIENT_ID),
  categories: createPrismaCategoryRepository(prisma),
  listings: createPrismaListingRepository(prisma),
  storage: pickStorageProvider(),
  admin: {
    auditLogs: createPrismaAuditLogRepository(prisma),
    users: createPrismaAdminUsersRepository(prisma),
    listings: createPrismaAdminListingsRepository(prisma),
  },
  uploadsDir: UPLOADS_DIR,
  orders: createPrismaOrderRepository(prisma),
  payments: createPrismaPaymentRepository(prisma),
  gateway: buildPaymentGateway(),
  db: prisma,
})
export default app // a Vercel usa este export; nada aqui chama listen

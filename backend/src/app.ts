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
import {
  createPrismaReviewRepository,
  createReviewsRoutes,
  createReviewsService,
  type ReviewRepository,
} from './modules/reviews'
import { createOrdersService } from './modules/orders/orders.service'
import type { OrderRepository } from './modules/orders/orders.types'
import { createPrismaPaymentRepository } from './modules/payments/payments.repository'
import { createPaymentsRoutes } from './modules/payments/payments.routes'
import { createPaymentsService } from './modules/payments/payments.service'
import type { PaymentRepository } from './modules/payments/payments.types'
import { prisma } from './shared/database/prisma'
import { buildProviders } from './shared/providers'
import type { MockPaymentGateway } from './shared/providers/payment/mock.provider'
import type { PaymentGateway } from './shared/providers/payment/payment.gateway'
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
import {
  createGeneralLimiter,
  createRateLimiter,
  createUserLimiter,
} from './shared/middlewares/rate-limiter'
import { requestId } from './shared/middlewares/request-id'
import { withDeliveryGuard } from './shared/providers/mail/guard'
import type { MailProvider } from './shared/providers/mail/mail.provider'
import type { OAuthProvider } from './shared/providers/oauth/oauth.provider'
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
  /** Avaliações de pedido concluído (RN-AVA-01 a 05). */
  reviews?: ReviewRepository
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

  // Limite geral: 100 por minuto por IP (backend.md §6). Desligado nos testes, como os demais; o /health,
  // os jobs e o webhook ficam de fora (ver rate-limiter.ts).
  if (env.APP_ENV !== 'test') app.use('/api/v1', createGeneralLimiter())

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
    // Todo driver passa pela guarda: nada é enviado a endereço anonimizado (RN-NOT-03).
    const mail = withDeliveryGuard(deps.mail)
    const service = createAuthService({
      ...deps,
      mail,
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
    // Troca de e-mail: mesmo teto (10 por minuto por IP), mas contador próprio, para não gastar o orçamento do login.
    const emailChangeLimiter =
      env.APP_ENV === 'test'
        ? (((_req, _res, next) => next()) satisfies express.RequestHandler)
        : createRateLimiter(10)
    const usersService = createUsersService({
      users: deps.users,
      profiles: deps.profiles,
      tokens: deps.tokens,
      mail,
      config: {
        allowedEmailDomain: env.ALLOWED_EMAIL_DOMAIN,
        frontendUrl: env.FRONTEND_URL[0] ?? '',
      },
      ...(deps.now && { now: deps.now }),
      ...(deps.storage && { storage: deps.storage }),
    })
    app.use('/api/v1/auth', routes.auth)
    app.use('/api/v1/users', routes.users)
    app.use(
      '/api/v1/users',
      createUsersRoutes(usersService, authenticate, {
        avatar: Boolean(deps.storage),
        limiter: emailChangeLimiter, // RN-PER-02: mesmo teto das rotas de /auth, contador próprio
      }),
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
                mail,
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
    // Avaliações: a fatia de /orders vem ANTES do roteador de pedidos (que exige aluno em tudo).
    if (deps.reviews) {
      const reviewRoutes = createReviewsRoutes(
        createReviewsService({ reviews: deps.reviews }),
        authenticate,
      )
      app.use('/api/v1/orders', reviewRoutes.forOrders)
      app.use('/api/v1/listings', reviewRoutes.forListings)
    }
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
        mail,
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
          // 30 por minuto por usuário nas cobranças (backend.md §6)
          userLimiter: env.APP_ENV === 'test' ? noLimit : createUserLimiter(30),
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

const UPLOADS_DIR = resolve(process.cwd(), 'uploads')

// Ponto único de composição: repositories reais (Prisma) e providers escolhidos por buildProviders.
const providers = buildProviders(env, { uploadsDir: UPLOADS_DIR })
export const app = createApp({
  users: createPrismaUserRepository(prisma),
  profiles: createPrismaProfileRepository(prisma),
  tokens: createPrismaTokenRepository(prisma),
  mail: providers.mail,
  oauth: providers.oauth,
  categories: createPrismaCategoryRepository(prisma),
  listings: createPrismaListingRepository(prisma),
  storage: providers.storage,
  admin: {
    auditLogs: createPrismaAuditLogRepository(prisma),
    users: createPrismaAdminUsersRepository(prisma),
    listings: createPrismaAdminListingsRepository(prisma),
  },
  ...(env.STORAGE_DRIVER === 'local' ? { uploadsDir: UPLOADS_DIR } : {}),
  orders: createPrismaOrderRepository(prisma),
  reviews: createPrismaReviewRepository(prisma),
  payments: createPrismaPaymentRepository(prisma),
  gateway: providers.gateway,
  db: prisma,
})
export default app // a Vercel usa este export; nada aqui chama listen

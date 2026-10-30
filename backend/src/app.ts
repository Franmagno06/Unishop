import compression from 'compression'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env } from './config/env'
import { createJwt } from './config/jwt'
import {
  createPrismaTokenRepository,
  createPrismaUserRepository,
} from './modules/auth/auth.repository'
import { prisma } from './shared/database/prisma'
import { consoleMailProvider } from './shared/providers/mail/console.provider'
import { createAuthService } from './modules/auth/auth.service'
import { createAuthRoutes } from './modules/auth/auth.routes'
import { createPrismaCategoryRepository } from './modules/categories/categories.repository'
import { createCategoriesRoutes } from './modules/categories/categories.routes'
import { createCategoriesService } from './modules/categories/categories.service'
import type { CategoryRepository } from './modules/categories/categories.types'
import type { TokenRepository, UserRepository } from './modules/auth/auth.types'
import { createPrismaProfileRepository } from './modules/users/users.repository'
import { createUsersRoutes } from './modules/users/users.routes'
import { createUsersService } from './modules/users/users.service'
import type { ProfileRepository } from './modules/users/users.types'
import { createAuthenticate } from './shared/middlewares/authenticate'
import { errorHandler, notFoundHandler } from './shared/middlewares/error-handler'
import { createRateLimiter } from './shared/middlewares/rate-limiter'
import { requestId } from './shared/middlewares/request-id'
import type { MailProvider } from './shared/providers/mail/mail.provider'
import { createGoogleProvider } from './shared/providers/oauth/google.provider'
import type { OAuthProvider } from './shared/providers/oauth/oauth.provider'

export type AppDeps = {
  users: UserRepository
  profiles: ProfileRepository
  tokens: TokenRepository
  mail: MailProvider
  oauth: OAuthProvider
  categories?: CategoryRepository
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
    })
    app.use('/api/v1/auth', routes.auth)
    app.use('/api/v1/users', routes.users)
    app.use('/api/v1/users', createUsersRoutes(usersService, authenticate))
    if (deps.categories) {
      const categoriesService = createCategoriesService({ categories: deps.categories })
      app.use('/api/v1/categories', createCategoriesRoutes(categoriesService, authenticate))
    }
  }

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
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
})
export default app // a Vercel usa este export; nada aqui chama listen

import type { RequestHandler } from 'express'
import type { Jwt } from '../../config/jwt'
import type { UserRepository } from '../../modules/auth/auth.types'
import { AppError } from '../errors/app-error'
import type { UserRole } from '../types/express'

type Options = { allowPendingTerms?: boolean }

// Ordem do backend.md §8. Consulta a conta a cada requisição: suspensão e troca de senha valem na hora.
export function createAuthenticate(
  users: UserRepository,
  jwt: Jwt,
  now: () => Date = () => new Date(),
  lastSeenThrottleMs = 60_000,
) {
  return ({ allowPendingTerms = false }: Options = {}): RequestHandler =>
    async (req, _res, next) => {
      try {
        const [scheme, token] = req.headers.authorization?.split(' ') ?? []
        if (scheme !== 'Bearer' || !token) {
          throw new AppError(401, 'UNAUTHENTICATED', 'Faça login para continuar.')
        }

        const payload = jwt.verify(token)
        const user = await users.findById(Number(payload.sub))
        if (!user || user.status === 'deleted') {
          throw new AppError(401, 'UNAUTHENTICATED', 'Faça login para continuar.')
        }
        if (user.status === 'suspended') {
          throw new AppError(403, 'ACCOUNT_SUSPENDED', 'Sua conta está suspensa.')
        }
        // Token emitido antes da última troca de senha (comparação em segundos).
        if (
          user.passwordChangedAt &&
          payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
        ) {
          throw new AppError(401, 'TOKEN_INVALID', 'Sessão inválida. Entre novamente.')
        }
        if (!allowPendingTerms && user.termsAcceptedAt === null) {
          throw new AppError(403, 'TERMS_NOT_ACCEPTED', 'Aceite os Termos para continuar.')
        }

        req.user = { id: user.id, role: user.role }
        const at = now()
        await users.touchLastSeen(user.id, at, new Date(at.getTime() - lastSeenThrottleMs))
        next()
      } catch (err) {
        next(err)
      }
    }
}
export type Authenticate = ReturnType<typeof createAuthenticate>

export const authorizeRole =
  (...roles: UserRole[]): RequestHandler =>
  (req, _res, next) =>
    req.user && roles.includes(req.user.role)
      ? next()
      : next(new AppError(403, 'FORBIDDEN', 'Você não tem permissão para isso.'))

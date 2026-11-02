import type { Request } from 'express'
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import { AppError } from '../errors/app-error'

const tooMany = (_req: unknown, _res: unknown, next: (err?: unknown) => void) =>
  next(new AppError(429, 'TOO_MANY_REQUESTS', 'Muitas tentativas. Aguarde um pouco.'))

// Limite por IP (backend.md §6). A contagem por conta do login é outra: fica no banco (RN-ACE-09).
export const createRateLimiter = (limit: number, windowMs = 60_000) =>
  rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, handler: tooMany })

// Rotas técnicas fora do limite geral: monitor de saúde, jobs agendados (têm segredo) e o webhook do
// gateway (tem limite próprio e folgado).
const isExempt = (path: string) =>
  path.startsWith('/health') || path.startsWith('/internal/') || path === '/payments/webhook'

/** Limite geral da API: 100 por minuto por IP (backend.md §6). Monte em `/api/v1`. */
export const createGeneralLimiter = (limit = 100, windowMs = 60_000) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => isExempt(req.path),
    handler: tooMany,
  })

/**
 * Limite por usuário logado (backend.md §6, `/payments`: 30 por minuto). Vai DEPOIS do `authenticate`;
 * sem usuário na requisição, cai para o IP.
 */
export const createUserLimiter = (limit: number, windowMs = 60_000) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req: Request) =>
      req.user ? `user:${req.user.id}` : ipKeyGenerator(req.ip ?? ''),
    handler: tooMany,
  })

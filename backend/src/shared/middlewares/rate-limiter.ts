import { rateLimit } from 'express-rate-limit'
import { AppError } from '../errors/app-error'

// Limite por IP (backend.md §6). A contagem por conta do login é outra: fica no banco (RN-ACE-09).
export const createRateLimiter = (limit: number, windowMs = 60_000) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(new AppError(429, 'TOO_MANY_REQUESTS', 'Muitas tentativas. Aguarde um pouco.')),
  })

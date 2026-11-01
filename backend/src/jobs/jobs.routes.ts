import { timingSafeEqual } from 'node:crypto'
import { Router, type RequestHandler } from 'express'
import { AppError } from '../shared/errors/app-error'
import type { JobRegistry } from './registry'

// Comparação em tempo constante, sem vazar o tamanho do segredo.
function sameSecret(received: string, expected: string): boolean {
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

// `GET /api/v1/internal/jobs/:name` com `Authorization: Bearer <CRON_SECRET>`. Sem JWT e sem rate
// limit (backend.md §14). Sem CRON_SECRET configurado, nenhum job roda: `Bearer undefined` é 401.
export function createJobsRoutes(registry: JobRegistry, cronSecret: string | undefined) {
  const guard: RequestHandler = (req, _res, next) => {
    const [scheme, token] = req.headers.authorization?.split(' ') ?? []
    if (!cronSecret || scheme !== 'Bearer' || !token || !sameSecret(token, cronSecret)) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Não autorizado.'))
    }
    next()
  }

  const router = Router()
  router.get('/:name', guard, async (req, res) => {
    const name = String(req.params.name)
    const job = Object.hasOwn(registry, name) ? registry[name] : undefined
    if (!job) throw new AppError(404, 'NOT_FOUND', 'Job não encontrado.')
    res.json({ data: await job() })
  })
  return router
}

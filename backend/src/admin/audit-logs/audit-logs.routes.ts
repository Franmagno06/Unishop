import { Router } from 'express'
import { validateQuery } from '../../shared/middlewares/validate'
import { createAuditLogsController } from './audit-logs.controller'
import { listAuditLogsQuerySchema } from './audit-logs.schemas'
import type { AuditLogsService } from './audit-logs.service'

// A proteção (authenticate + admin) vem de admin.routes.ts, uma vez só (RN-ADM-01).
export function createAuditLogsRoutes(service: AuditLogsService) {
  const c = createAuditLogsController(service)
  const router = Router()
  // RN-ADM-10: histórico de ações do admin.
  router.get('/', validateQuery(listAuditLogsQuerySchema), c.list)
  return router
}

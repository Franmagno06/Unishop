import type { Request, Response } from 'express'
import type { z } from 'zod'
import type { listAuditLogsQuerySchema } from './audit-logs.schemas'
import type { AuditLogsService } from './audit-logs.service'

export function createAuditLogsController(service: AuditLogsService) {
  return {
    async list(req: Request, res: Response) {
      const { page, limit, ...filters } = req.validatedQuery as z.output<
        typeof listAuditLogsQuerySchema
      >
      res.json(await service.list(filters, { page, limit }))
    },
  }
}

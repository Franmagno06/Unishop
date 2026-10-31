import type { Request, Response } from 'express'
import type { z } from 'zod'
import { adminUserIdParamSchema, type listAdminUsersQuerySchema } from './admin-users.schemas'
import type { AdminUsersService } from './admin-users.service'

export function createAdminUsersController(service: AdminUsersService) {
  return {
    async list(req: Request, res: Response) {
      const { page, limit, search } = req.validatedQuery as z.output<
        typeof listAdminUsersQuerySchema
      >
      res.json(await service.list({ search }, { page, limit }))
    },
    async stats(_req: Request, res: Response) {
      res.json({ data: await service.stats() })
    },
    async get(req: Request, res: Response) {
      const { id } = adminUserIdParamSchema.parse(req.params) // ZodError vira 400 no errorHandler
      res.json({ data: await service.get(id) })
    },
  }
}

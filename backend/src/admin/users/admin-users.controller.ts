import type { Request, Response } from 'express'
import type { z } from 'zod'
import {
  adminUserIdParamSchema,
  type listAdminUsersQuerySchema,
  type updateAdminUserSchema,
} from './admin-users.schemas'
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
    // RN-ADM-04, 05, 12
    async update(req: Request, res: Response) {
      const { id } = adminUserIdParamSchema.parse(req.params)
      const { status } = req.body as z.output<typeof updateAdminUserSchema>
      res.json({ data: await service.updateStatus(req.user!.id, id, status) })
    },
  }
}

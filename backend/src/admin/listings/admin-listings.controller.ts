import type { Request, Response } from 'express'
import type { z } from 'zod'
import {
  adminListingIdParamSchema,
  type listAdminListingsQuerySchema,
} from './admin-listings.schemas'
import type { AdminListingsService } from './admin-listings.service'

export function createAdminListingsController(service: AdminListingsService) {
  return {
    async list(req: Request, res: Response) {
      const { page, limit, search, category } = req.validatedQuery as z.output<
        typeof listAdminListingsQuerySchema
      >
      res.json(await service.list({ search, categoryId: category }, { page, limit }))
    },
    async stats(_req: Request, res: Response) {
      res.json({ data: await service.stats() })
    },
    async get(req: Request, res: Response) {
      const { id } = adminListingIdParamSchema.parse(req.params) // ZodError vira 400 no errorHandler
      res.json({ data: await service.get(id) })
    },
  }
}

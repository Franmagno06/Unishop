import type { Request, Response } from 'express'
import type { z } from 'zod'
import {
  adminListingIdParamSchema,
  type listAdminListingsQuerySchema,
  type updateAdminListingSchema,
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
    // RN-ADM-08, 10
    async update(req: Request, res: Response) {
      const { id } = adminListingIdParamSchema.parse(req.params)
      const { status } = req.body as z.output<typeof updateAdminListingSchema>
      res.json({ data: await service.updateStatus(req.user!.id, id, status) })
    },
    // RN-ADM-09: sem corpo; a confirmação é do modal do frontend (Q6) e o motivo fica fora (Q1).
    async remove(req: Request, res: Response) {
      const { id } = adminListingIdParamSchema.parse(req.params)
      await service.remove(req.user!.id, id)
      res.status(204).end()
    },
  }
}

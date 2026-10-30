import type { Request, Response } from 'express'
import type { z } from 'zod'
import { listingIdParamSchema, type listListingsQuerySchema } from './listings.schemas'
import type { ListingsService } from './listings.service'

export function createListingsController(service: ListingsService) {
  return {
    async recent(req: Request, res: Response) {
      const { limit } = req.validatedQuery as { limit: number }
      res.json({ data: await service.recent(limit) })
    },
    async list(req: Request, res: Response) {
      const { filters, pagination } = req.validatedQuery as z.output<typeof listListingsQuerySchema>
      res.json(await service.list(filters, pagination))
    },
    async get(req: Request, res: Response) {
      const { id } = listingIdParamSchema.parse(req.params) // ZodError vira 400 no errorHandler
      res.json({ data: await service.get(req.user!.id, id) })
    },
  }
}

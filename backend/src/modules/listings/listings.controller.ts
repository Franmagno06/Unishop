import type { Request, Response } from 'express'
import type { z } from 'zod'
import {
  imageParamsSchema,
  listingIdParamSchema,
  type createListingBodySchema,
  type listListingsQuerySchema,
} from './listings.schemas'
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
    async create(req: Request, res: Response) {
      const body = req.body as z.output<typeof createListingBodySchema>
      res.status(201).json({ data: await service.create(req.user!.id, body, req.file!.buffer) })
    },
    async addImage(req: Request, res: Response) {
      const { id } = listingIdParamSchema.parse(req.params)
      res.status(201).json({ data: await service.addImage(req.user!.id, id, req.file!.buffer) })
    },
    async removeImage(req: Request, res: Response) {
      const { id, imageId } = imageParamsSchema.parse(req.params)
      await service.removeImage(req.user!.id, id, imageId)
      res.status(204).end()
    },
  }
}
